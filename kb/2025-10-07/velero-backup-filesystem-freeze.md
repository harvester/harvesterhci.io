---
title: 'VM Data Consistency for External CSI Storage Backup with Velero'
description: 'Learn how to implement filesystem freeze for External CSI Storage Backup with Velero to ensure data consistency.'
authors:
  - name: Webber Huang
    title: Senior Software Engineer
    url: https://github.com/WebberHuang1118
    image_url: https://github.com/WebberHuang1118.png
tags: [backup, csi, storage, velero, filesystem-freeze]
hide_table_of_contents: false
---

In this [Harvester Knowledge Base article](https://harvesterhci.io/kb/2025/05/26/velero-backup-restore), [Ivan Sim](https://github.com/ihcsim) provided comprehensive guidance on using [Velero](https://velero.io/) to perform backup and restore operations for VMs with external storage in Harvester.

However, in certain scenarios, users may require the VM filesystem to be quiesced during Velero backup creation to prevent data corruption, especially when the VM is experiencing heavy I/O operations.

This article describes how to customize [Velero Backup Hooks](https://velero.io/docs/v1.17/backup-hooks/) to implement filesystem freeze during Velero backup processing, ensuring data consistency in the backup content.

## Background Knowledge

KubeVirt's [virt-freezer](https://github.com/kubevirt/kubevirt/blob/main/docs/freeze.md#virt-freezer) provides a mechanism to freeze and thaw guest filesystems. This capability can be leveraged to ensure filesystem consistency during VM backups. However, certain prerequisites must be met for filesystem freeze/thaw operations to function properly:

### Prerequisites for Filesystem Freeze

* **QEMU Guest Agent must be enabled** in the guest VM
  * Verify this by checking if the VMI has **AgentConnected** in its status
* **Guest VM must be properly configured** for related libvirt commands
  * When **virt-freezer** is triggered, KubeVirt communicates with the **QEMU Guest Agent** via libvirt commands such as **guest-fsfreeze-freeze**
  * The guest agent translates these commands to OS-specific calls:
    * **Linux systems**: Uses **fsfreeze** syscalls
    * **Windows systems**: Uses **VSS** (Volume Shadow Copy Service) APIs

### Common Configuration Challenges

Based on Harvester project experience, some guest operating systems require additional configuration:

* **Linux distributions** (e.g., RHEL, SLE Micro): May lack sufficient permissions for filesystem freeze operations by default, requiring custom policies
* **Windows guests**: Require the **VSS** service to be enabled for filesystem freeze functionality

> **Important**: Filesystem freeze/thaw functionality depends on guest VM configuration, which is outside Harvester's control. Users are responsible for ensuring compatibility before implementing Velero backup hooks with filesystem freeze.

### Verifying Filesystem Freeze Compatibility

To confirm that your VM supports filesystem freeze operations:

1. Access the virtual machine's virt-launcher `compute` container:

   ```bash
   POD=$(kubectl get pods -n default \
     -l vm.kubevirt.io/name=vm1 \
     -o jsonpath='{.items[0].metadata.name}')
   kubectl exec -it $POD -n default -c compute -- bash
   ```

2. Test filesystem freeze using the [virt-freezer](https://github.com/kubevirt/kubevirt/blob/main/docs/freeze.md#virt-freezer) application available in the `compute` container:

   ```bash
   virt-freezer --freeze --namespace <VM namespace> --name <VM name>
   ```

3. **Critical**: Always verify the freeze operation result and thaw the VM filesystems before performing any other operations

## Prerequisites

All preparation steps outlined in [External CSI Storage Backup and Restore With Velero](https://harvesterhci.io/kb/2025/05/26/velero-backup-restore) are mandatory, including:

- Harvester installation and configuration
- Velero installation and setup
- S3-compatible storage configuration
- Proper networking and permissions

## Implementing Filesystem Freeze Hooks for VM Backup Consistency

Velero supports pre and post backup hooks that can be integrated with KubeVirt's **virt-freezer** to ensure filesystem consistency during VM backups.

### Configuring VM Template Annotations

For all VMs requiring data consistency, add the following annotations to the VM template:

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: vm-nfs
  namespace: demo
spec:
  template:
    metadata:
      annotations:
        # These annotations will be applied to the virt-launcher pod
        pre.hook.backup.velero.io/command: '["/usr/bin/virt-freezer", "--freeze", "--namespace", "[VM Namespace]", "--name", "[VM Name]"'
        pre.hook.backup.velero.io/container: compute
        pre.hook.backup.velero.io/on-error: Fail
        pre.hook.backup.velero.io/timeout: 30s
        
        post.hook.backup.velero.io/command: '["/usr/bin/virt-freezer", "--unfreeze", "--namespace", "[VM Namespace]", "--name", "[VM Name]"]'
        post.hook.backup.velero.io/container: compute
        post.hook.backup.velero.io/timeout: 30s
    spec:
      # ...rest of VM spec...
```

These annotations will be propagated to the related virt-launcher pod and instruct Velero to:
- **Freeze** the VM filesystem before backup creation begins
- **Thaw** the VM filesystem after backup completion

**Important**: Replace `<VM Namespace>` and `<VM Name>` with the actual namespace and name of your VM.

## Creating a Velero Backup with Filesystem Freeze

After applying the [Velero pre/post hook annotations to the VM manifest](#configuring-vm-template-annotations), follow the [backup procedures](https://harvesterhci.io/kb/2025/05/26/velero-backup-restore/#backup-the-source-namespace) described in [External CSI Storage Backup and Restore With Velero](https://harvesterhci.io/kb/2025/05/26/velero-backup-restore/).

### Verifying Successful Hook Execution

If the guest VM is configured correctly, the Velero backup will complete successfully with **HooksAttempted** indicating successful hook execution.

Check the backup status using:

```sh
velero backup describe [Backup Name] --details
```

Example output showing successful hook execution:

```sh
Name:         demo
Namespace:    velero
Labels:       velero.io/storage-location=default
Annotations:  velero.io/resource-timeout=10m0s
              velero.io/source-cluster-k8s-gitversion=v1.33.3+rke2r1
              velero.io/source-cluster-k8s-major-version=1
              velero.io/source-cluster-k8s-minor-version=33

Phase:  Completed


Namespaces:
  Included:  demo
  Excluded:  <none>

Resources:
  Included:        *
  Excluded:        <none>
  Cluster-scoped:  auto

Label selector:  <none>

Or label selector:  <none>

Storage Location:  default

Velero-Native Snapshot PVs:  auto
Snapshot Move Data:          true
Data Mover:                  velero

....

Backup Volumes:
  Velero-Native Snapshots: <none included>

  CSI Snapshots:
    demo/vm-nfs-disk-0-au2ej:
      Data Movement:
        Operation ID: du-be5417aa-498e-4b93-b59f-e6498f95a6df.d7f97dab-3bb1-41e189381
        Data Mover: velero
        Uploader Type: kopia
        Moved data Size (bytes): 5368709120
        Result: succeeded

  Pod Volume Backups: <none included>

HooksAttempted:  2
HooksFailed:     0
```

The output shows that Velero pre/post backup hooks completed successfully. In this case, the hooks are connected to guest VM filesystem freeze and thaw operations to ensure data consistency.

## Restoring the Velero Backup

Follow the restoration procedures described in [External CSI Storage Backup and Restore With Velero](https://harvesterhci.io/kb/2025/05/26/velero-backup-restore/#restore-to-a-different-namespace) to restore the namespace using Velero.

## Troubleshooting

If you encounter issues with filesystem freeze operations:

1. **Verify QEMU Guest Agent status** in the VMI
2. **Check guest OS configuration** for filesystem freeze support
3. **Review Velero hook logs** for specific error messages
4. **Test virt-freezer manually** as described in the verification section

## Conclusion

Implementing filesystem freeze hooks with Velero ensures data consistency during VM backups by quiescing the filesystem before snapshot creation. This approach is particularly valuable for VMs with high I/O activity or critical data that requires point-in-time consistency guarantees.