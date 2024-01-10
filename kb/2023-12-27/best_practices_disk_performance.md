---
title: Best Practices for Optimizing Longhorn Disk Performance
description: Follow the recommendations for achieving optimal disk performance.
slug: best_practices_for_optimizing_longhorn_disk_performance
authors:
  - name: David Ko
    title: Senior Software Engineering Manager
    url: https://github.com/innobead
    image_url: https://github.com/innobead.png
  - name: Jillian Maroket
    title: Technical Writer
    url: https://github.com/jillian-maroket/
    image_url: https://github.com/jillian-maroket.png
tags: [harvester, longhorn, best practices, disk performance]
hide_table_of_contents: false
---

# Best Practices for Optimizing Longhorn Disk Performance

The Longhorn documentation provides [best practice recommendations](https://longhorn.io/docs/1.5.3/best-practices/) for deploying Longhorn in production environments. Before configuring workloads, ensure that you have set up the following basic requirements for optimal disk performance.

- SATA/NVMe SSDs or disk drives with similar performance
- 10 Gbps network bandwidth between nodes
- Dedicated Priority Classes for system-managed and user-deployed Longhorn components

The following sections outline other recommendations for achieving optimal disk performance.

## IO Performance

- **Storage network**: Use a [dedicated storage network](https://docs.harvesterhci.io/v1.2/advanced/storagenetwork) to improve IO performance and stability.  

- **Longhorn disk**: Use a [dedicated disk](https://docs.harvesterhci.io/v1.2/host/#multi-disk-management) for Longhorn storage instead of using the root disk.  

- **Replica count**: Set the [default replica count](https://docs.harvesterhci.io/v1.2/advanced/storageclass#parameters-tab) to "2" to achieve data availability with better disk space usage or less impact to system performance. This practice is especially beneficial to data-intensive applications.  

- **Storage tag**: Use storage tags to define storage tiering for data-intensive applications. For example, only high-performance disks can be used for storing performance-sensitive data. You can either [add disks with tags](https://docs.harvesterhci.io/v1.2/host/#storage-tags) or [create StorageClasses with tags](https://docs.harvesterhci.io/v1.2/advanced/storageclass#disk-selector-optional).  

- **Data locality**: Use `best-effort` as the default [data locality](https://longhorn.io/docs/1.5.3/high-availability/data-locality/) of Longhorn Storage Classes.  

  For applications that support data replication (for example, a distributed database), you can use the `strict-local` option to ensure that only one replica is created for each volume. This practice prevents the extra disk space usage and IO performance overhead associated with volume replication.  

  For data-intensive applications, you can use pod scheduling functions such as node selector or taint toleration. These functions allow you to schedule the workload to a specific storage-tagged node together with one replica.  

## Space Efficiency  

- **Recurring snapshots**: Periodically clean up system-generated snapshots and retain only the number of snapshots that makes sense for your implementation. 

  For applications with replication capability, periodically [delete all types of snapshots](https://longhorn.io/docs/1.5.3/concepts/#243-deleting-snapshots).

## Disaster Recovery

- **Recurring backups**: Create [recurring backup jobs](https://longhorn.io/docs/1.5.3/volumes-and-nodes/trim-filesystem/) for mission-critical application volumes.

- **System backup**: Run periodic system backups.