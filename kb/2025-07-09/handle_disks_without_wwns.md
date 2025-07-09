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

In order for Harvester to identify extra data disks, each disk needs to have a [WWN](https://en.wikipedia.org/wiki/World_Wide_Name). Without this, Harvester will be unable to uniquely identify the disks, so will not list them as available when [adding additional disks](https://docs.harvesterhci.io/v1.5/host/#add-additional-disks) in the Harvester GUI. Specifically, Harvester's [node-disk-manager](https://github.com/harvester/node-disk-manager) component looks for the `ID_WWN` value from udev for each disk. There are cases where this value will not be present, notably when disks are connected to certain types of hardware RAID controller. In this case you will be able to see the disk if you `ssh` in to a host and (for example) run `cat /proc/partitions`, but it will not appear in the Harvester GUI.

There are two possible workarounds to make disks without WWNs visible to Harvester:

## 1. Make a filesystem on the disk

:::caution
This technique is only viable if you are using the disks with the Longhorn V1 provisioner, which is filesystem-based. It _will not work correctly_ with the LVM or Longhorn V2 provisioner as these are block device-based.
:::

Making a filesystem on the disk, for example `mkfs.ext4 /dev/sda`, will give the disk a filesystem UUID, and Harvester will fall back to looking at this value for disks that do not have WWNs. Prior to Harvester v1.6.0, this will potentially only work for _one_ extra disk due to a [bug in duplicate device checking](https://github.com/harvester/harvester/issues/7173).

## 2. Add a udev rule to generate WWNs

This technique will generate WWNs for disks that don't have them, based on the device serial number. From Harvester's perspective it doesn't matter that they're not "real" WWNs, just so long we have unique values for `ID_WWN` as presented by udev. It will work regardless of which provisioner is used.

To do this, we need to create a YAML file in the `/oem` directory on each host which defines the appropriate udev rule. This can be done automatically on all nodes in a Harvester cluster using a [CloudInit Resource](https://docs.harvesterhci.io/v1.5/host/#creating-a-cloudinit-resource) as follows:

1. Create a YAML file named `fake-scsi-wwn-generator.yaml` with the following content:
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
2. Apply this to the cluster by running `kubectl apply -f fake-scsi-wwn-generator.yaml`. This will result in the file `/oem/90_fake_scsi_wwn_generator.yaml` being created automatically on all node in the cluster.
3. Reboot each node to pick up the new udev rules.

Once this is done, any extra disks which previously did not appear in the Harvester GUI should now be visible and able to be added.

## References

- Harvester: [Issue 7173](https://github.com/harvester/harvester/issues/7173)
