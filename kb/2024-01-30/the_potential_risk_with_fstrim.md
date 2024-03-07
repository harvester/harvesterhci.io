---
title: Mitigating fstrim Risk
description: The potential risk with fstrim and how to avoid it
slug: the_potential_risk_with_fstrim
authors:
  - name: Vicente Cheng
    title: Senior Software Engineer
    url: https://github.com/Vicente-Cheng
    image_url: https://github.com/Vicente-Cheng.png
tags: [harvester, rancher integration, longhorn, fstrim]
hide_table_of_contents: false
---

:::note
This issue is already resolved by Longhorn v1.5.4, v1.6.1, v1.7.0 and later versions.
:::


Using fstrim is a common way to release unused space in a filesystem. However, this utility is known to cause IO errors when used with Longhorn volumes that are rebuilding. For more information about the errors, see the following issues:

- Harvester: [Issue 4793](https://github.com/harvester/harvester/issues/4739)
- Longhorn: [Issue 7103](https://github.com/longhorn/longhorn/issues/7103)

## Risks Associated with fstrim Usage

A consequence of the IO errors caused by fstrim is that VMs using affected Longhorn volumes become stuck. Imagine the VM is running critical applications, then becomes unavailable. This is significant because Harvester typically uses Longhorn volumes as VM disks. The IO errors will cause VMs to flap between running and paused states until volume rebuilding is completed.

Although the described system behavior does not affect data integrity, it might induce panic in some users. Consider the guest Kubernetes cluster scenario. In a stuck VM, the etcd service is unavailable. The effects of this failure cascade from the Kubernetes cluster becoming unavailable to services running on the cluster becoming unavailable.

## Risk Mitigation

One way to mitigate the described risks is to disable fstrim in VMs. fstrim is enabled by default in many modern Linux distributions.
You can determine if fstrim is enabled in VMs that use affected Longhorn volumes by checking the following:

  - `/etc/fstab`: Some root filesystems mount with the *discard* option.

    Example:
    ```
    /dev/mapper/rootvg-rootlv /                       xfs     defaults,discard        0 0
    ```
    
    You can disable fstrim on the root filesystem by removing the *discard* option.
    ```
    /dev/mapper/rootvg-rootlv /                       xfs     defaults        0 0   <-- remove the discard option
    ```
    
    After removing the *discard* option, you can remount the root filesystem using the command `mount -o remount /` or by rebooting the VM.

  - `fstrim.timer`: When this service is enabled, fstrim executes weekly by default. You can either disable the service or edit the service file to prevent simultaneous fstrim execution on VMs.

    You can disable the service using the following command:
    ```
    systemctl disable fstrim.timer
    ```

    To prevent simultaneous fstrim execution, use the following values in the service file (located at `/usr/lib/systemd/system/fstrim.timer`):
    ```
    [Timer]
    OnCalendar=weekly
    AccuracySec=1h
    Persistent=true
    RandomizedDelaySec=6000
    ```