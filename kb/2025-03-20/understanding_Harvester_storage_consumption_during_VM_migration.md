---
title: Understanding Harvester storage consumption while importing a VM
description: 'This article explains how Harvester allocates storage while importing the virtual machine (VM) using the VM import controller, focusing on the storage implications when importing larger VMs. Understanding these mechanics is crucial for effective storage planning and ensuring a seamless import process.'
slug: understanding_harvester_storage_consumption_during_VM_import
authors:
  - name: Devendra Kulkarni
    title: Customer Support Engineer IV
    url: https://github.com/devendra-suse
    image_url: https://github.com/devendra-suse.png
tags: [virt-import-controller, disk-usage, longhorn]
hide_table_of_contents: false
---

This article explains how Harvester allocates storage while importing the virtual machine (VM) using the VM import controller, focusing on the storage implications when importing larger VMs. Understanding these mechanics is crucial for effective storage planning and ensuring a smooth import process.

## Harvester's Storage Allocation Mechanism:

Harvester employs a distributed block-storage architecture utilizing Longhorn. Key concepts to understand include:

- **Backing Images:** These are the base disk images of your VMs, stored as qcow2 files.
- **Volume Replicas:** Harvester creates multiple replicas of the VM's volumes across cluster nodes for redundancy and high availability. By default, three copies of the backing image and three volume replicas are created.
- **Sparse Files:** Harvester uses Linux sparse files, meaning that storage space is allocated but not immediately consumed. Physical disk space is only utilized as data is written to the VM.
- **Snapshots:** Both system and user-created snapshots contribute to storage consumption.
    * **System Snapshots:** Used for internal operations, like replica rebuilding.
    * **User Snapshots:** Created by users for data protection.
- **Volume Head:** The active writable layer of the volume.


## Storage Consumption Breakdown:

Each volume replica consists of:

- The backing image
- Any snapshots (system or user)
- The volume head


## Storage Implications for a large size VM:

To illustrate storage consumption, let's consider migrating a 500GB VM.

- **Default Configuration:** Harvester's default configuration involves three copies of the backing image and three volume replicas.
- **Worst-Case Scenario:** In the worst-case scenario, we assume all allocated space is utilized. This means each node will store:
    - One copy of the 500GB backing image.
    - One 500GB volume head.
    - Potential space for snapshots, maximum 500GB.
    - Therefore each node could allocate up to 1.5TB of storage.
- **Cluster-Wide Allocation:** Across a three-node cluster, this could lead to a potential storage allocation of 4.5TB for a single 500GB VM.
- **Actual Usage:** It is important to remember that actual storage usage will likely be significantly lower due to the use of sparse files. Only the space that contains actual data will be consumed.


## Key Recommendations:

- Ensure your Harvester cluster has sufficient storage capacity to accommodate the potential worst-case scenario.
- Plan for the worst-case storage scenario, but understand that actual usage will likely be lower.
- Maintain the default three backing image copies for data redundancy.
- Consider the amount of snapshots that will be taken.
- Review and configure Harvester cluster using [Best Practices for Optimizing Longhorn Disk Performance](https://harvesterhci.io/kb/best_practices_for_optimizing_longhorn_disk_performance).
- Use the `du -sh /var/lib/harvester/defaultdisk/*` command on Harvester nodes to check actual file sizes and storage consumption.


## References:

- Refer to the Longhorn documentation for detailed information on [volume size](https://longhorn.io/docs/1.8.1/nodes-and-volumes/volumes/volume-size/), [replica management](https://longhorn.io/docs/1.8.1/concepts/#231-how-read-and-write-operations-work-for-replicas), [backing images](https://longhorn.io/docs/1.8.1/advanced-resources/backing-image/backing-image/) and [snapshots](https://longhorn.io/docs/1.8.1/concepts/#24-snapshots).
- [Sparse File](https://en.wikipedia.org/wiki/Sparse_file)
