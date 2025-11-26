---
title: Troubleshooting VM Live Migration Issues Caused by Node Selectors
description: 'How to resolve VM live migration failures when target nodes lack specific features due to nodeSelector constraints.'
slug: troubleshooting_vm_scheduling_issues_nodeselector
authors:
  - name: Jack Yu
    title: Senior Software Engineer
    url: https://github.com/Yu-Jack
    image_url: https://github.com/Yu-Jack.png
tags: [harvester, virtual machine, VM, scheduling, nodeSelector, troubleshooting]
hide_table_of_contents: false
---

## Problem Description

When a virtual machine (VM) cannot be live migrated to a target node because of `nodeSelector` constraints, it often indicates a mismatch between the VM's requirements and the node's capabilities.

For example, a VM might have a `nodeSelector` requiring a specific CPU feature (e.g., `cpu-feature.node.kubevirt.io/fpu: "true"`), but the target node lacks this label. This prevents the scheduler from migrating the VM to that node.

This article describes how to resolve this issue using two different approaches.

## Solution 1: Reboot the VM to Clean nodeSelector of the Pod

If the `nodeSelector` was automatically added by KubeVirt (for instance, during a previous migration or initial start), rebooting the VM will clear these dynamic selectors.

Once the VM is rebooted, the restrictive `nodeSelector` is removed, allowing the VM to be scheduled on any available node.

## Solution 2: Reboot and Set Up a Common CPU Model (Prevent KubeVirt from Adding CPU Features)

After the rebooting, you can refer to [Set up a common CPU model for virtual machine migration](../2025-09-30/setup_common_cpu_model_for_vm_live_migration.md). 

After setting up a CPU model in the VM spec, KubeVirt won't add the CPU feature into the nodeSelector of the POD. 

If you're creating a fresh VM, we also recommend this way if you have live migration requirement.

## Solution 3: Modify Node Labels (No Reboot Required)

If rebooting the VM is not an option, you can manually manipulate the target node's labels to satisfy the scheduling requirements.

### Step 1: Prevent Automatic Label Updates

First, add the `node-labeller.kubevirt.io/skip-node="true"` annotation to the target node.

```bash
kubectl annotate node <node-name> node-labeller.kubevirt.io/skip-node="true"
```

This annotation prevents KubeVirt's node-labeller from automatically adding or removing CPU-related labels on this node. Note that this annotation persists even after upgrades.

**Important:** The annotation itself does not affect the Pod's `nodeSelector`. It only controls the presence of specific CPU-related labels on the node (see [References](#references)), which the `nodeSelector` checks against.

### Step 2: Add Missing Labels

If the VM requires specific labels that the node is missing, you can manually add them to the target node.

1. Identify the missing labels from the VM's `nodeSelector`.
2. Add these labels to the target node:

   ```bash
   kubectl label node <node-name> <key>=<value>
   ```

This temporarily "tricks" the scheduler into seeing the node as compatible, allowing the VM to live migrate there.

## Solution 4: Remove Node Labels (to Prevent Future Constraints)

If you want to ensure that the VM does not acquire specific `nodeSelector` constraints after live migration, you can remove the [relevant CPU labels](#kubevirt-node-labels) from the target node.

**Prerequisite:** You must apply the `node-labeller.kubevirt.io/skip-node="true"` annotation to the target node as described in **Solution 2, Step 1**.

This method works **only if the VM's Pod does not currently have a specific `nodeSelector` containing the labels listed in [References](#references)**. Otherwise, you must reboot the VM to clear the constraints.

1. Check if the Pod has a `nodeSelector`:

    ```bash
    kubectl get pod <pod-name> -o yaml | grep nodeSelector -A 5 -B 5
    ```

2. If no such `nodeSelector` is present, you can safely remove the CPU labels from the node.

    By doing this, the Pod will not acquire new `nodeSelector` constraints upon migration, allowing it to be freely migrated to other nodes in the future.

## Limitations

If you choose **Solution 3**, be aware that this is a manual override.

If you add a new node to the cluster in the future that lacks the required feature, and you wish to migrate the VM to that new node, you must repeat the process:
1. Add the `node-labeller.kubevirt.io/skip-node="true"` annotation to the new node.
2. Manually add the required labels.

## References

### KubeVirt Node Labels

The `node-labeller.kubevirt.io/skip-node="true"` annotation prevents updates to the following labels:

- `cpu-feature.node.kubevirt.io/*`
- `cpu-model-migration.node.kubevirt.io/*`
- `cpu-model.node.kubevirt.io/*`
- `host-model-cpu.node.kubevirt.io`
- `host-model-required-features.node.kubevirt.io`

### External Links

- [Labeling nodes with CPU models, CPU features and machine types](https://kubevirt.io/user-guide/compute/virtual_hardware/#labeling-nodes-with-cpu-models-cpu-features-and-machine-types)
