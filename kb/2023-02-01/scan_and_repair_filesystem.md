---
title: Scan and Repair Root Filesystem of VirtualMachine
description: Scan and repair root filesystem of VM
slug: scan-and-repair-vm-root-filesystem
authors:
  - name: Vicente Cheng
    title: Senior Software Engineer
    url: https://github.com/Vicente-Cheng
    image_url: https://github.com/Vicente-Cheng.png
tags: [storage, longhorn, root, filesystem]
hide_table_of_contents: false
---

In earlier versions of Harvester (v1.0.3 and prior), Longhorn volumes may get corrupted during the replica rebuilding process (reference: [Analysis: Potential Data/Filesystem Corruption](https://longhorn.io/kb/troubleshooting-volume-filesystem-corruption/#solution)). In Harvester v1.1.0 and later versions, the Longhorn team has fixed this issue. This article covers manual steps you can take to scan the VM's filesystem and repair it if needed.


## Stop The VM And Backup Volume

Before you scan the filesystem, it is recommend you back up the volume first. For an example, refer to the following steps to stop the VM and backup the volume.

- Find the target VM.

![finding the target VM](./imgs/finding_the_target_vm.png)

- Stop the target VM.

![Stop the target VM](./imgs/stop_the_target_vm.png)

The target VM is stopped and the related volumes are detached. Now go to the Longhorn UI to backup this volume.

- Enable `Developer Tools & Features` (Preferences -> Enable Developer Tools & Features).

![Preferences then enable developer mode](./imgs/preferences_enable_developer_mode.png)
![Enable the developer mode](./imgs/enable_the_developer_mode.png)

- Click the `⋮` button and select **Edit Config** to edit the config page of the VM.

![goto edit config page of VM](./imgs/goto_vm_edit_config_page.png)

- Go to the `Volumes` tab and select `Check volume details.`

![link to longhorn volume page](./imgs/link_to_longhorn_volume.png)

- Click the dropdown menu on the right side and select 'Attach' to attach the volume again. 

![attach this volume again](./imgs/attach_this_volume_again.png)

- Select the attached node. 

![choose the attached node](./imgs/choose_the_attached_node.png)

- Check the volume attached under `Volume Details` and select `Take Snapshot` on this volume page.

![take snapshot on volume page](./imgs/take_snapshot_on_volume_page.png)

- Confirm that the snapshot is ready.

![check the snapshot is ready](./imgs/check_the_snapshot_is_ready.png)

Now that you completed the volume backup, you need to scan and repair the root filesystem.

## Scanning the root filesystem and repairing

This section will introduce how to scan the filesystem (e.g., XFS, EXT4) using related tools.

Before scanning, you need to know the filesystem's device/partition.

- Find the filesystem's device by running the `dmesg` command. The most recent device should be what we wanted because we attach the latest.
- You should now know the filesystem's partition. In the example below, sdd3 is the filesystem's partition.

![finding the related device](./imgs/finding_related_device.png)

- Use the Filesystem toolbox image to scan and repair.

```
# docker run -it --rm --privileged registry.opensuse.org/isv/rancher/harvester/toolbox/main/fs-toolbox:latest -- bash
```

Then we try to scan with this target device.

### XFS

When scanning a XFS filesystem, use the `xfs_repair` command as follows, where `/dev/sdd3` is the problematic partition of the device.

```
# xfs_repair -n /dev/sdd3
```

To repair the corrupted partition, run the following command.

```
# xfs_repair /dev/sdd3
```

### EXT4

When scanning a EXT4 filesystem, use the `e2fsck` command as follows, where the `/dev/sde1` is the problematic partition of the device.

```
# e2fsck -f /dev/sde1
```

To repair the corrupted partition, run the following command.

```
# e2fsck -fp /dev/sde1
```


After using the 'e2fsck' command, you should also see logs related to scanning and repairing the partition. Scanning and repairing the corrupted partition is successful if there are no errors in these logs. 


## Detach and Start VM again.

After the corrupted partition is scanned and repaired, detach the volume and try to start the related VM again.

- Detach the volume from the Longhorn UI.

![detach volume on longhorn UI](./imgs/detach_volume.png)

- Start the related VM again from the Longhorn UI.

![Start VM again](./imgs/start_vm_again.png)

Your VM should now work normally.
