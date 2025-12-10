---
title: Storage Allocation and Consumption During Virtual Machine Importing
description: 'This article explains how Harvester (via the vm-import-controller add-on) allocates and consumes storage during importing of virtual machines, focusing on the storage implications for large virtual machines. Understanding these mechanics is crucial for effective storage planning and ensuring a seamless import process.'
slug: understanding_harvester_storage_consumption_during_VM_import
authors:
  - name: Devendra Kulkarni
    title: Customer Support Engineer IV
    url: https://github.com/devendra-suse
    image_url: https://github.com/devendra-suse.png
tags: [virt-import-controller, disk-usage, longhorn]
hide_table_of_contents: false
---

This article explains how Harvester (via the vm-import-controller add-on) allocates and consumes storage during importing of virtual machines, focusing on the storage implications for large virtual machines. Understanding these mechanics is crucial for effective storage planning and ensuring a seamless import process.

## Storage Allocation Mechanism

Harvester employs a distributed block-storage architecture utilizing Longhorn. Key concepts include the following:
- **Backing images**: These are qcow2 images that serve as the base disk images of virtual machines. By default, three copies of each backing image are created.
- **Volume replicas**: Harvester creates replicas of virtual machine volumes across cluster nodes for redundancy and high availability. Each volume replica consists of the backing image, the volume head, and snapshots. By default, three replicas are created for each volume.
- **Sparse files**: Harvester uses Linux sparse files, which means that storage space is allocated but not immediately consumed. Physical disk space is consumed only as data is written to the virtual machine.
- **Snapshots**: Both system and user-created snapshots contribute to storage consumption. Harvester creates snapshots for internal operations such as replica rebuilding. You can also create snapshots for data protection and other purposes.
- **Volume Head**: This is the active writable layer of the volume.

## Storage Implications for Large Virtual Machines

The following example illustrates storage allocation and consumption for a large virtual machine.
- **Virtual machine size**: 500 GB
- **Default configuration**: By default, Harvester creates three backing image copies and three volume replicas.
- **Worst-case scenario**: Each node stores a copy of the backing image (500 GB), the volume head (500 GB), and space for snapshots (500 GB maximum). The assumption is that all allocated space (up to 1.5 TB) is consumed.
- **Cluster-wide allocation**: In a three-node cluster, you may need to allocate 4.5 TB of storage for a single 500 GB virtual machine.
- **Actual usage**: The use of sparse files will likely result in significantly lower storage consumption, since only space containing actual data is consumed.

## Key Recommendations

- Ensure that your Harvester cluster has sufficient storage capacity to accommodate the worst-case scenario.
- Plan for the worst-case scenario, but understand that actual consumption will likely be lower.
- Maintain the default number of backing image copies for data redundancy.
- Consider the total number of snapshots that will be created.
- Review and configure the Harvester cluster using the [Best Practices for Optimizing Longhorn Disk Performance](https://harvesterhci.io/kb/best_practices_for_optimizing_longhorn_disk_performance).
- Use the command `du -sh /var/lib/harvester/defaultdisk/*` on Harvester nodes to check actual file sizes and storage consumption.

## References

- Longhorn documentation: [volume size](https://longhorn.io/docs/1.8.1/nodes-and-volumes/volumes/volume-size/), [replica management](https://longhorn.io/docs/1.8.1/concepts/#231-how-read-and-write-operations-work-for-replicas), [backing images](https://longhorn.io/docs/1.8.1/advanced-resources/backing-image/backing-image/), [snapshots](https://longhorn.io/docs/1.8.1/concepts/#24-snapshots)
- [Sparse file](https://en.wikipedia.org/wiki/Sparse_file)
