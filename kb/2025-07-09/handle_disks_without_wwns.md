---
title: Handling Disks That Don't Appear in the Harveser GUI
description: 'How to add extra disks to Harvester when they have no WWN and thus do not appear in the list of available disks in the Harvester GUI'
slug: handle_disks_without_wwns
authors:
  - name: Tim Serong
    title: Master Software Engineer
    url: https://github.com/tserong
    image_url: https://github.com/tserong.png
tags: [storage, disk]
hide_table_of_contents: false
---

Harvester allows you to [add disks](https://docs.harvesterhci.io/v1.5/host/#add-additional-disks) as data volumes. However, only disks that have a [World Wide Name (WWN)](https://en.wikipedia.org/wiki/World_Wide_Name) are displayed on the UI. This occurs because the Harvester [`node-disk-manager`](https://github.com/harvester/node-disk-manager) uses the `ID_WWN` value from udev to uniquely identify disks. The value may not exist in certain situations, particularly when the disks are connected to certain hardware RAID controllers. In these situations, you can view the disks only if you access the host using SSH and run a command such as `cat /proc/partitions`.

To allow extra disks without WWNs to be visible to Harvester, perform either of the following workarounds:

## Workaround 1: Create a filesystem on the disk

:::caution

Use this method only if the provisioner of the extra disk is **Longhorn V1**, which is filesystem-based. This method _will not work correctly_ with **LVM** and **Longhorn V2**, which are both block device-based.

:::

When you create a filesystem on a disk (for example, using the command `mkfs.ext4 /dev/sda`), a filesystem UUID is assigned to the disk. Harvester uses this value to identify disks without a WWN.

In Harvester versions earlier than v1.6.0, you can use this workaround for only _one extra disk_ because of a [bug in duplicate device checking](https://github.com/harvester/harvester/issues/7173).

## Workaround 2: Add a udev rule for generating fake WWNs

:::note

This method works with all of the supported provisioners.

:::

You can add a udev rule that generates a fake WWN for each extra disk based on the device serial number. Harvester accepts the generated WWNs because the only requirement is a unique `ID_WWN` value as presented by udev.

A YAML file containing the necessary udev rule must be created in the `/oem` directory on each host. This process can be automated across the Harvester cluster using a [CloudInit Resource](https://docs.harvesterhci.io/v1.5/host/#creating-a-cloudinit-resource).

1. Create a YAML file named `fake-scsi-wwn-generator.yaml` with the following contents:

    ```yaml
    apiVersion: node.harvesterhci.io/v1beta1
    kind: CloudInit
    metadata:
      name: fake-scsi-wwn-generator
    spec:
      matchSelector: {}
      filename: 90_fake_scsi_wwn_generator.yaml
      contents: |
        name: "Add udev rules to generate missing SCSI disk WWNs"
        stages:
          initramfs:
            - files:
                - path: /etc/udev/rules.d/59-fake-scsi-wwn-generator.rules
                  permissions: 420
                  owner: 0
                  group: 0
                  content: |
                    # For anything that looks like a SCSI disk (/dev/sd*),
                    # if it has a serial number, but does _not_ have a WWN,
                    # create a fake WWN based on the serial number.  We need
                    # to set both ID_WWN so Harvester's node-disk-manager
                    # can see the WWN, and ID_WWN_WITH_EXTENSION which is
                    # what 60-persistent-storage.rules uses to generate a
                    # /dev/disk/by-id/wwn-* symlink for the device.
                    ACTION=="add|change", SUBSYSTEM=="block", KERNEL=="sd*[!0-9]", \
                      ENV{ID_SERIAL}=="?*", \
                      ENV{ID_WWN}!="?*", ENV{ID_WWN_WITH_EXTENSION}!="?*", \
                      ENV{ID_WWN}="fake.$env{ID_SERIAL}", \
                      ENV{ID_WWN_WITH_EXTENSION}="fake.$env{ID_SERIAL}"
    ```

1. Apply the file's contents to the cluster by running the command `kubectl apply -f fake-scsi-wwn-generator.yaml`.

    The file `/oem/90_fake_scsi_wwn_generator.yaml` is automatically created on all cluster nodes.

1. Reboot all nodes to apply the new udev rule.

Once the rule is applied, you should be able to view and add extra disks that were previously not visible on the Harvester UI.

## References

- Harvester: [Issue 7173](https://github.com/harvester/harvester/issues/7173)
