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

- **Storage network**: Use a dedicated storage network to improve IO performance and stability.  

- **Longhorn disk**: Use a dedicate for Longhorn storage instead of using the root disk.  

- **Replica count**: Set the [default replica count](https://longhorn.io/docs/1.5.3/references/settings/#default-replica-count) to "2" to achieve data availability with better disk space usage or less impact to system performance. This practice is especially beneficial to data-intensive applications.  

- **Storage tag**: Use [storage tags](https://longhorn.io/docs/1.5.3/volumes-and-nodes/storage-tags/) to define storage tiering for data-intensive applications. For example, only high-performance disks can be used for storing performance-sensitive data.  

- **Data locality**: Use `best-effort` as the default [data locality](https://longhorn.io/docs/1.5.3/high-availability/data-locality/) of Longhorn Storage Classes.  

  For applications that support data replication (for example, a distributed database), you can use the `strict-local` option to ensure that only one replica is created for each volume. This practice prevents the extra disk space usage and IO performance overhead associated with volume replication.  

  For data-intensive applications, you can use pod scheduling functions such as node selector or taint toleration. These functions allow you to schedule the workload to a specific storage-tagged node together with one replica.  

- **Revision counter**: You can disable the [revision counter](https://longhorn.io/docs/1.5.3/advanced-resources/deploy/revision_counter/) to improve IO performance, especially for write-intensive applications. When the revision counter is disabled, Longhorn does not track write operations for replicas and the Longhorn Engine does not check the `revision.counter` file after restarting.

  :::info important
  IO performance is improved only if the cluster nodes sync time from a dedicated, close, and highly accurate NTP server with minimal sync delay (measured in microseconds).
  :::

## Space Efficiency  

- **Recurring snapshots**: Periodically clean up system-generated snapshots and retain only the number of snapshots that makes sense for your implementation. For applications with replication capability, periodically [delete all types of snapshots](https://longhorn.io/docs/1.5.3/concepts/#243-deleting-snapshots).

- **Recurring filesystem trim**: Periodically [trim the filesystem](https://longhorn.io/docs/1.5.3/volumes-and-nodes/trim-filesystem/) inside volumes to reclaim disk space.

## Disaster Recovery

- **Recurring backups**: Create [recurring backup jobs](https://longhorn.io/docs/1.5.3/volumes-and-nodes/trim-filesystem/) for mission-critical application volumes.

- **System backup**: Run periodic system backups.