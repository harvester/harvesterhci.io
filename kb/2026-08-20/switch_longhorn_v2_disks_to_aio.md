---
title: Work Around Longhorn V2 IOMMU Errors With a Linux Device Path
description: "How to diagnose Longhorn V2 SPDK NVMe attach failures and manually add the disk with a stable Linux device path"
slug: switch_longhorn_v2_disks_to_aio
authors:
  - name: Cooper Tseng
    title: Senior Software Engineer
    url: https://github.com/brandboat
    image_url: https://github.com/brandboat.png
tags: [storage, longhorn, disk, troubleshooting]
hide_table_of_contents: false
---

Longhorn V2 can use the SPDK NVMe driver for local NVMe disks. On some hardware, the NVMe PCI device is in the same IOMMU group as other PCI devices, such as PCI bridges or NICs. When Longhorn tries to attach the disk through the SPDK NVMe path, DPDK can reject the device because the whole IOMMU group is not available to VFIO.

In this case, avoid the SPDK NVMe path by using a regular Linux block device path, such as `/dev/disk/by-id/nvme-...`, instead of a PCI BDF path, such as `0000:05:00.0`.

:::important Version scope

This KB applies to Harvester versions earlier than v1.9.0. Before v1.9.0, an unspecified Longhorn V2 `BlockDevice` disk driver defaults to `auto`, and changing `spec.provisioner.longhorn.diskDriver` to `aio` is not enough because node-disk-manager can still register direct-attached NVMe and virtio disks with a PCI BDF path.

The workaround is to remove the failed Harvester-provisioned disk entry and manually add the disk through the Longhorn UI with a stable Linux device path.

Starting with Harvester v1.9.0, new Longhorn V2 disks default to `aio`, and node-disk-manager includes the path-resolution fix for [harvester/harvester#10666](https://github.com/harvester/harvester/issues/10666). This workaround should not be needed on v1.9.0 and later for newly added Longhorn V2 disks.

:::

## Symptoms

Use this KB when the affected disk is a Longhorn V2 block disk and the driver/path fields point to the SPDK NVMe path:

- In the Longhorn `Node` disk spec, `spec.disks.<DISK_NAME>.diskDriver` is `auto` or `nvme`.
- In the corresponding Harvester `BlockDevice`, `spec.provisioner.longhorn.diskDriver` is `auto` or not set. Before Harvester v1.9.0, an unset value is treated as `auto`.
- In the Longhorn `Node` disk spec, `spec.disks.<DISK_NAME>.path` is a PCI BDF address, such as `0000:05:00.0`.

In this state, Longhorn uses the SPDK NVMe path and tries to attach the disk by PCI address. If the PCI device is in a shared IOMMU group, DPDK rejects the attach and the Longhorn disk remains not ready.

This behavior matches the [Longhorn IOMMU group isolation requirement](https://longhorn.io/docs/latest/deploy/install/#iommu-group-isolation-requirement): for the V2 Data Engine, SPDK uses VFIO and must be able to claim the whole IOMMU group. If the NVMe device shares an IOMMU group with a PCIe bridge or another device that cannot be bound to VFIO, use AIO instead of the SPDK NVMe path.

Common symptoms include the following:

- The Longhorn `Node` resource reports `NoDiskInfo` or `DiskNotReady`.
- The disk status message says that the disk is not ready and the current state is `creating` or `error`.
- Longhorn instance-manager logs show DPDK, VFIO, or SPDK NVMe attach failures.
- Kernel or sysfs data shows that the target NVMe controller shares an IOMMU group with other PCI devices.

Example Longhorn disk status:

```yaml
spec:
  disks:
    673b3f54-2c5f-474e-83de-86f1021f8c38:
      allowScheduling: true
      diskDriver: auto
      diskType: block
      path: "0000:05:00.0"
      storageReserved: 0
      tags: []
status:
  diskStatus:
    673b3f54-2c5f-474e-83de-86f1021f8c38:
      conditions:
      - message: 'Disk 673b3f54-2c5f-474e-83de-86f1021f8c38(0000:05:00.0)
          on node hp-37-tink-system is not ready: errors: disk is not in ready
          state, current state: error'
        reason: NoDiskInfo
        status: "False"
        type: Ready
      - message: Disk 673b3f54-2c5f-474e-83de-86f1021f8c38 (0000:05:00.0)
          on the node hp-37-tink-system is not ready
        reason: DiskNotReady
        status: "False"
        type: Schedulable
      diskDriver: ""
      diskName: ""
      diskPath: ""
      diskType: block
      diskUUID: ""
      storageAvailable: 0
      storageMaximum: 0
      storageScheduled: 0
```

Example instance-manager log:

```text
[longhorn-instance-manager] time="2026-08-28T09:28:18Z" level=info msg="Disk Server: Creating disk" blockSize=512 diskDriver=auto diskName=673b3f54-2c5f-474e-83de-86f1021f8c38 diskPath="0000:05:00.0" diskType=block
[longhorn-instance-manager] time="2026-08-28T09:28:28Z" level=info msg="Creating disk bdev" blockSize=512 diskDriver=nvme diskName=673b3f54-2c5f-474e-83de-86f1021f8c38 diskPath="0000:05:00.0"
EAL: 0000:05:00.0 VFIO group is not viable! Not all devices in IOMMU group bound to VFIO or unbound
EAL: Driver cannot attach the device (0000:05:00.0)
EAL: Failed to attach device on primary process
[2026-08-28 09:28:33] bdev_nvme.c:6931:spdk_bdev_nvme_create: *ERROR*: No controller was found with provided trid (traddr: 0000:05:00.0)
[longhorn-instance-manager] time="2026-08-28T09:31:33Z" level=error msg="Failed to add block device" blockSize=512 diskDriver=auto diskName=673b3f54-2c5f-474e-83de-86f1021f8c38 diskPath="0000:05:00.0" error="failed to create disk bdev: failed to attach NVMe disk 0000:05:00.0"
```

You might also see related follow-on messages, such as `failed to find running instance manager`, `failed to get disk config: disk service client is nil`, `No supported IOMMU extensions found`, `VFIO support could not be initialized`, or `Requested device <PCI_ADDRESS> cannot be used`.

## Confirm the Issue

### Identify the BlockDevice and Longhorn Disk

List Longhorn V2 `BlockDevice` resources:

```shell
kubectl -n longhorn-system get blockdevices.harvesterhci.io \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,DEVPATH:.spec.devPath,ENGINE:.spec.provisioner.longhorn.engineVersion,DRIVER:.spec.provisioner.longhorn.diskDriver,PROVISION:.spec.provision,STATE:.status.state,PHASE:.status.provisionPhase
```

Example output:

```text
NAME                                   NODE                 DEVPATH        ENGINE       DRIVER   PROVISION   STATE      PHASE
673b3f54-2c5f-474e-83de-86f1021f8c38   hp-37-tink-system    /dev/nvme1n1   LonghornV2   auto     true        Active     Provisioned
```

The `BlockDevice` `STATE` can be `Active` or `Inactive`. `Active` means node-disk-manager can see the Linux block device on the host. It does not mean that the Longhorn V2 disk is ready.

Inspect the Longhorn `Node` resource and find the disk entry that matches the `BlockDevice` name:

```shell
kubectl -n longhorn-system get nodes.longhorn.io NODE_NAME -o yaml
```

The affected disk usually has the following pattern:

```yaml
spec:
  disks:
    DISK_NAME:
      diskDriver: auto
      diskType: block
      path: "0000:05:00.0"
status:
  diskStatus:
    DISK_NAME:
      conditions:
      - reason: NoDiskInfo
        status: "False"
        type: Ready
      - reason: DiskNotReady
        status: "False"
        type: Schedulable
```

### Check the Instance-Manager Log

Find the V2 instance-manager that handles disks on the affected node.

First, check whether Longhorn has already recorded the disk's instance-manager name in the Longhorn `Node` status:

```shell
kubectl -n longhorn-system get nodes.longhorn.io NODE_NAME \
  -o go-template='{{with index .status.diskStatus "DISK_NAME"}}{{.instanceManagerName}}{{"\n"}}{{end}}'
```

If the command returns a name, use that value as `INSTANCE_MANAGER_POD`.

If the value is empty, the disk may have failed before Longhorn updated `status.diskStatus.<DISK_NAME>.instanceManagerName`. This is common for the `VFIO group is not viable` failure. In that case, list the Longhorn `InstanceManager` resources and select the V2 all-in-one instance-manager on the affected node:

```shell
kubectl -n longhorn-system get instancemanagers.longhorn.io \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeID,TYPE:.spec.type,DATA_ENGINE:.spec.dataEngine,STATE:.status.currentState
```

Use the `NAME` from the row where `NODE` is `NODE_NAME`, `TYPE` is `aio`, and `DATA_ENGINE` is `v2`.

Example output:

```text
NAME                                                NODE                TYPE   DATA_ENGINE   STATE
instance-manager-2d8aad9f0e37b6f3e4e4f65d236421fe   hp-37-tink-system   aio    v2            running
instance-manager-65a4c87009705672125be4beb6dca5a8   hp-37-tink-system   aio    v1            running
```

In this example, use `instance-manager-2d8aad9f0e37b6f3e4e4f65d236421fe`. The `TYPE` value `aio` means all-in-one instance-manager. The `DATA_ENGINE` value identifies whether the instance-manager belongs to the V1 or V2 Data Engine.

Check the `instance-manager` container log:

```shell
kubectl -n longhorn-system logs INSTANCE_MANAGER_POD -c instance-manager
```

Check whether the log contains `VFIO group is not viable` for the disk's PCI address. If it does, Longhorn attempted to use the SPDK NVMe path and DPDK rejected the device because the IOMMU group was not fully available to VFIO.

### Verify the IOMMU Group

Use the PCI address from the Longhorn disk path or from the `BlockDevice` bus path. For example, the `BlockDevice` bus path `pci-0000:05:00.0-nvme-1` maps to the PCI address `0000:05:00.0`.

You can get the bus path with the following command:

```shell
kubectl -n longhorn-system get blockdevices.harvesterhci.io BLOCKDEVICE_NAME \
  -o jsonpath='{.status.deviceStatus.details.busPath}{"\n"}'
```

SSH to the affected node and check the IOMMU group:

```shell
PCI_ADDRESS=0000:05:00.0
GROUP=$(basename "$(readlink -f "/sys/bus/pci/devices/${PCI_ADDRESS}/iommu_group")")
printf 'PCI_ADDRESS=%s\nIOMMU_GROUP=%s\n' "${PCI_ADDRESS}" "${GROUP}"
ls -1 "/sys/kernel/iommu_groups/${GROUP}/devices"
```

Example output for a shared IOMMU group:

```text
PCI_ADDRESS=0000:05:00.0
IOMMU_GROUP=14
0000:00:02.0
0000:00:02.1
0000:00:02.2
0000:00:02.3
0000:04:00.0
0000:04:00.1
0000:05:00.0
```

Use `lspci` to identify the devices in the group:

```shell
for dev in /sys/kernel/iommu_groups/${GROUP}/devices/*; do
  lspci -s "$(basename "${dev}")"
done
```

Example output:

```text
00:02.0 PCI bridge: Intel Corporation Xeon E7 v3/Xeon E5 v3/Core i7 PCI Express Root Port 2 (rev 02)
00:02.1 PCI bridge: Intel Corporation Xeon E7 v3/Xeon E5 v3/Core i7 PCI Express Root Port 2 (rev 02)
00:02.2 PCI bridge: Intel Corporation Xeon E7 v3/Xeon E5 v3/Core i7 PCI Express Root Port 2 (rev 02)
00:02.3 PCI bridge: Intel Corporation Xeon E7 v3/Xeon E5 v3/Core i7 PCI Express Root Port 2 (rev 02)
04:00.0 Ethernet controller: Intel Corporation 82599ES 10-Gigabit SFI/SFP+ Network Connection (rev 01)
04:00.1 Ethernet controller: Intel Corporation 82599ES 10-Gigabit SFI/SFP+ Network Connection (rev 01)
05:00.0 Non-Volatile memory controller: Samsung Electronics Co Ltd NVMe SSD Controller PM9C1a (DRAM-less)
```

If the output contains only the target PCI address, the IOMMU group is isolated. In that case, continue checking the Longhorn disk status and instance-manager log before concluding that the problem is caused by shared IOMMU group membership.

## Work Around the Issue

### 1. Record the Disk Information

On the Harvester UI, go to **Hosts**, select the node that contains the disk, and then select the **Storage** tab. Note the block device name, device path, node name, provisioner, and disk tags.

You can also record the information from the command line:

```shell
kubectl -n longhorn-system get blockdevices.harvesterhci.io BLOCKDEVICE_NAME -o yaml
kubectl -n longhorn-system get nodes.longhorn.io NODE_NAME -o yaml
```

In the rest of this KB, replace the following placeholders:

- `NODE_NAME`: The Longhorn node name.
- `DISK_NAME`: The Longhorn disk name. This usually matches the Harvester `BlockDevice` name.
- `BLOCKDEVICE_NAME`: The Harvester `BlockDevice` name.
- `PCI_ADDRESS`: The PCI BDF path from the Longhorn disk spec, such as `0000:05:00.0`.
- `DEVICE_PATH`: A stable Linux device path for the same disk, such as `/dev/disk/by-id/nvme-eui.0025385451419a2c`.

If you only know the short device path, such as `/dev/nvme1n1`, SSH to the node and find a stable `/dev/disk/by-id/...` path for the same device:

```shell
DEV_PATH=/dev/nvme1n1
for path in /dev/disk/by-id/*; do
  if [ "$(readlink -f "${path}")" = "${DEV_PATH}" ]; then
    echo "${path}"
  fi
done
```

### 2. Unprovision the Disk

Use the Harvester UI to unprovision the disk:

1. Go to **Hosts**.
1. Select the node that contains the disk.
1. Go to the **Storage** tab.
1. Find the target disk and select **x**.
1. Select **Save**.

Wait until the disk is removed from the node storage list.

Confirm that the disk was removed from the Longhorn `Node` spec:

```shell
kubectl -n longhorn-system get nodes.longhorn.io NODE_NAME \
  -o go-template='{{range $name, $disk := .spec.disks}}{{printf "%s path=%s driver=%s\n" $name $disk.path $disk.diskDriver}}{{end}}'
```

The output should not include `DISK_NAME`.

### 3. Add the Disk Through the Longhorn UI

Manually add the same disk through the Longhorn UI using `DEVICE_PATH`. The Longhorn UI does not expose a disk-driver selector in this flow, so use the stable Linux device path instead of the PCI BDF path. Disk tags are optional unless your StorageClasses require them.

1. Access the embedded Longhorn UI.
1. Go to **Node**, and then expand `NODE_NAME`.
1. Select **Edit node and disks**.
1. Add a disk.
1. Set the disk name to `DISK_NAME`.
1. Set the disk path to `DEVICE_PATH`. Use a stable `/dev/disk/by-id/...` path, not the PCI BDF path.
1. Set the disk type to **Block**.
1. Optional: Reapply any disk tags that are required by your StorageClasses.
1. Select **Save**.

### 4. Verify the Result

When using the Longhorn UI workaround, the Harvester `BlockDevice` should remain unprovisioned:

```shell
kubectl -n longhorn-system get blockdevices.harvesterhci.io BLOCKDEVICE_NAME \
  -o custom-columns=NAME:.metadata.name,PROVISION:.spec.provision,STATE:.status.state,PHASE:.status.provisionPhase
```

Verify the Longhorn disk spec and status:

```shell
kubectl -n longhorn-system get nodes.longhorn.io NODE_NAME -o yaml
```

Check the exact status of `DISK_NAME` under `spec.disks` and `status.diskStatus`. The disk path should use `DEVICE_PATH`, not a PCI BDF path such as `0000:05:00.0`. The `Ready` and `Schedulable` conditions should become `True`.

Check the instance-manager log again. The original `EAL: <PCI_ADDRESS> VFIO group is not viable` message should not reappear for the manually added disk.

Repeat the procedure for each affected Longhorn V2 disk.

## References

- Harvester: [Issue 10666](https://github.com/harvester/harvester/issues/10666)
- Harvester: [Issue 11041](https://github.com/harvester/harvester/issues/11041)
- Longhorn: [IOMMU group isolation requirement](https://longhorn.io/docs/latest/deploy/install/#iommu-group-isolation-requirement)
