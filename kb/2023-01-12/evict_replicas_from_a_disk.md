---
title: Evicting Replicas From a Disk (the CLI way)
description: Evicting replicas from a disk (the CLI way)
slug: evicting-replicas-from-a-disk-the-cli-way
authors:
  - name: Kiefer Chang
    title: Engineer Manager
    url: https://github.com/bk201
    image_url: https://github.com/bk201.png
tags: [storage, longhorn, disk]
hide_table_of_contents: false
---

Harvester replicates volumes data across disks in a cluster. Before removing a disk, the user needs to evict replicas on the disk to other disks to preserve the volumes' configured availability. For more information about eviction in Longhorn, please check [Evicting Replicas on Disabled Disks or Nodes](https://longhorn.io/docs/1.3.2/volumes-and-nodes/disks-or-nodes-eviction/).

## Preparation

The doc describes how to evict a Longhorn disk with the `kubectl` command. Before it, the user needs to make sure the environment is set up correctly.
There are two recommended ways to do this:

1. Log in to any server role node and become root (`sudo -i`).
1. Download Kubeconfig file and use it locally
    - Install `kubectl` and `yq` program manually.
    - Open Harvester GUI,  click `support` at the bottom left of the page and click `Download KubeConfig` to download the Kubeconfig file.
    - Set the Kubeconfig file's path to `KUBECONFIG` environment variable. For example, `export KUBECONFIG=/path/to/kubeconfig`.


## Evicting replicas from a disk

1. List Longhorn nodes (names are identical to Kubernetes nodes):

    ```
    kubectl get -n longhorn-system nodes.longhorn.io
    ```

    Sample output:

    ```
    NAME    READY   ALLOWSCHEDULING   SCHEDULABLE   AGE
    node1   True    true              True          24d
    node2   True    true              True          24d
    node3   True    true              True          24d
    ```

1. List disks on a node. Assume we want to evict replicas of a disk on `node1`:

    ```
    kubectl get -n longhorn-system nodes.longhorn.io node1 -o yaml | yq e '.spec.disks'
    ```

    Sample output:

    ```
    default-disk-ed7af10f5b8356be:
      allowScheduling: true
      evictionRequested: false
      path: /var/lib/harvester/defaultdisk
      storageReserved: 36900254515
      tags: []
    ```

1. Assume disk `default-disk-ed7af10f5b8356be` is the target we want to evict replicas out of.

    Edit the node:
    ```
    kubectl edit -n longhorn-system nodes.longhorn.io node1 
    ```

    Update these two fields and save:
    - `spec.disks.<disk_name>.allowScheduling` to `false`
    - `spec.disks.<disk_name>.evictionRequested` to `true`

    Sample editing:

    ```
    default-disk-ed7af10f5b8356be:
      allowScheduling: false
      evictionRequested: true
      path: /var/lib/harvester/defaultdisk
      storageReserved: 36900254515
      tags: []
    ```

1. Wait for all replicas on the disk to be evicted.

    Get current scheduled replicas on the disk:
    ```
    kubectl get -n longhorn-system nodes.longhorn.io node1 -o yaml | yq e '.status.diskStatus.default-disk-ed7af10f5b8356be.scheduledReplica'
    ```

    Sample output:
    ```
    pvc-86d3d212-d674-4c64-b69b-4a2eb1df2272-r-7b422db7: 5368709120
    pvc-b06f0b09-f30c-4936-8a2a-425b993dd6cb-r-bb0fa6b3: 2147483648
    pvc-b844bcc6-3b06-4367-a136-3909251cb560-r-08d1ab3c: 53687091200
    pvc-ea6e0dff-f446-4a38-916a-b3bea522f51c-r-193ca5c6: 10737418240
    ```

    Run the command repeatedly, and the output should eventually become an empty map:
    ```
    {}
    ```

    This means Longhorn evicts replicas on the disk to other disks.

    :::note
    
    If a replica always stays in a disk, please open the Longhorn GUI and check if there is free space on other disks.
    :::
