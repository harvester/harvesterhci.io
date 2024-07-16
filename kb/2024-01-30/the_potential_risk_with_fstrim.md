---
title: Mitigating filesystem trim Risk
description: The potential risk with filesystem trim and how to avoid it
slug: the_potential_risk_with_filesystem_trim
authors:
  - name: Vicente Cheng
    title: Senior Software Engineer
    url: https://github.com/Vicente-Cheng
    image_url: https://github.com/Vicente-Cheng.png
tags: [harvester, rancher integration, longhorn, filesystem trim]
hide_table_of_contents: false
---

Filesystem trim is a common way to release unused space in a filesystem. However, this operation is known to cause IO errors when used with Longhorn volumes that are rebuilding. For more information about the errors, see the following issues:

- Harvester: [Issue 4793](https://github.com/harvester/harvester/issues/4739)
- Longhorn: [Issue 7103](https://github.com/longhorn/longhorn/issues/7103)

:::info important

Filesystem trim was introduced in Longhorn v1.4.0 because of [Issue 836](https://github.com/longhorn/longhorn/issues/836).

Longhorn volumes affected by the mentioned IO errors can disrupt operations in Harvester VMs that use those volumes. If you are using any of the affected Harvester versions, upgrade to a version with fixes or follow the instructions for risk mitigation in this article.

**Affected Harvester versions**: v1.2.0 (uses Longhorn v1.4.3), v1.2.1 (uses Longhorn v1.4.3), and v1.3.0 (uses Longhorn v1.6.0)

**Harvester versions with fixes**: v1.2.2 (uses Longhorn v1.5.5) and v1.3.1 (uses Longhorn v1.6.2)

:::

## Risks Associated with Filesystem Trim

A consequence of the IO errors caused by filesystem trim is that VMs using affected Longhorn volumes become stuck. Imagine the VM is running critical applications, then becomes unavailable. This is significant because Harvester typically uses Longhorn volumes as VM disks. The IO errors will cause VMs to flap between running and paused states until volume rebuilding is completed.

Although the described system behavior does not affect data integrity, it might induce panic in some users. Consider the guest Kubernetes cluster scenario. In a stuck VM, the etcd service is unavailable. The effects of this failure cascade from the Kubernetes cluster becoming unavailable to services running on the cluster becoming unavailable.

## How to Check If Filesystem Trim Is Enabled

### Linux

In most Linux distributions, filesystem trim is enabled by default. You can check if the related service fstrim is enabled by running the following command:


```
$ systemctl status fstrim.timer
● fstrim.timer - Discard unused blocks once a week
     Loaded: loaded (/lib/systemd/system/fstrim.timer; enabled; vendor preset: enabled)
     Active: active (waiting) since Mon 2024-03-18 03:40:24 UTC; 1 week 1 day ago
    Trigger: Mon 2024-04-01 01:00:06 UTC; 5 days left
   Triggers: ● fstrim.service
       Docs: man:fstrim

Mar 18 03:40:24 harvester-cluster-01-pool1-49b619f6-tpc4v systemd[1]: Started Discard unused blocks once a week.
```

When the fstrim.timer service is enabled, the system periodically runs fstrim.

### Windows

You can check if filesystem trim is enabled by running the following command:

```
C:\> fsutil behavior query DisableDeleteNotify
NTFS DisableDeleteNotify = 0  (Allows TRIM operations to be sent to the storage device)
ReFS DisableDeleteNotify = 0  (Allows TRIM operations to be sent to the storage device)
```

`DisableDeleteNotify = 0` indicates that TRIM operations are enabled. For more information, see [fsutil behavior](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/fsutil-behavior) in the Microsoft documentation.

## Risk Mitigation

### Linux

One way to mitigate the described risks is to disable fstrim services in VMs. fstrim services is enabled by default in many modern Linux distributions.
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

### Windows

To mitigate the described risks, you can disable TRIM operations using the following commands:

- ReFS v2
    ```
    C:\> fsutil behavior set DisableDeleteNotify ReFS 1
    ```

- NTFS and ReFS v1
    ```
    C:\> fsutil behavior set DisableDeleteNotify 1
    ```