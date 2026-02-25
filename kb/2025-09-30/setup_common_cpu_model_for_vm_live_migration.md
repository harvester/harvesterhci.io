---
title: Setting up a common CPU model for virtual machine migration
description: 'How to set up a common CPU model for virtual machine migration'
slug: setup_common_cpu_model_for_vm_live_migration
authors:
  - name: Jack Yu
    title: Senior Software Engineer
    url: https://github.com/Yu-Jack
    image_url: https://github.com/Yu-Jack.png
  - name: Samuel Vasconcelos
    title: Software Engineer
    url: https://github.com/susesamu
    image_url: https://github.com/susesamu.png
tags: [harvester, virtual machine, VM, live migration, policy, strategy, configuration]
hide_table_of_contents: false
---

## Problem Description

For Harvester to successfully migrate a virtual machine from one node to another, the source and target nodes must have compatible CPU models and features.

Harvester uses KubeVirt / QEMU / libvirt to manage and run virtual machines. When a VM starts, libvirt exposes a specific CPU feature set to the guest operating system. Live migration requires this CPU feature set to be identical on both source and target nodes.

Different CPU generations support different instruction sets and feature flags. If those differ, the live migration will be blocked to avoid instability or incorrect execution on the target node.

If the CPU model of a virtual machine isn't specified, KubeVirt assigns it the default `host-model` configuration so that the virtual machine has the CPU model closest to the one used on the host node.

KubeVirt automatically [adjusts the node selectors](https://kubevirt.io/user-guide/compute/virtual_hardware/#labeling-nodes-with-cpu-models-cpu-features-and-machine-types) of the associated `virt-launcher` Pod based on this configuration. If the CPU models and features of the source and target nodes do not match, the live migration may fail.

Let's examine an example.

When a virtual machine is first migrated to another node with the `SierraForest` CPU model, the following key-value pairs are added to the `spec.nodeSelector` field in the Pod spec.

```yaml
spec:
  nodeSelector:
    cpu-model-migration.node.kubevirt.io/SierraForest: "true"
    cpu-feature.node.kubevirt.io/fpu: "true"
    cpu-feature.node.kubevirt.io/vme: "true"
```

The above `nodeSelector` configuration is retained for subsequent migrations, which may fail if the new target node doesn't have the corresponding features or model.

For example, compare the CPU model and feature labels added by KubeVirt to the following two nodes:

```yaml
# Node A
labels:
  cpu-model-migration.node.kubevirt.io/SierraForest: "true"
  cpu-feature.node.kubevirt.io/fpu: "true"
  cpu-feature.node.kubevirt.io/vme: "true"

# Node B
labels:
  cpu-model-migration.node.kubevirt.io/SierraForest: "true"
  cpu-feature.node.kubevirt.io/vme: "true"
```

This virtual machine will fail to migrate to Node B due to the missing `fpu` feature. However, if the virtual machine doesn't actually require this feature, this can be frustrating. Therefore, setting up a common CPU model can resolve this issue.

## How to Set Up a Common CPU Model

You can define a custom CPU model to ensure that the `spec.nodeSelector` configuration in the Pod spec is assigned a CPU model that is compatible and common to all nodes in the cluster.

Consider this example.

We have the following node information: 

```yaml
# Node A
labels:
  cpu-model.node.kubevirt.io/IvyBridge: "true"
  cpu-feature.node.kubevirt.io/fpu: "true"
  cpu-feature.node.kubevirt.io/vme: "true"

# Node B
labels:
  cpu-model.node.kubevirt.io/IvyBridge: "true"
  cpu-feature.node.kubevirt.io/vme: "true"
```

If we set up `IvyBridge` as our CPU model in the virtual machine spec, KubeVirt only adds `cpu-model.node.kubevirt.io/IvyBridge` under `spec.nodeSelector` in the Pod spec.

```yaml
# Virtual Machine Spec
spec:
  template:
    spec:
      domain:
        cpu:
          model: IvyBridge

# Pod spec
spec:
  nodeSelector:
    cpu-model.node.kubevirt.io/IvyBridge: "true"
```

With this configuration, your virtual machine can be migrated to any node that has the label `cpu-model.node.kubevirt.io/IvyBridge`.

## Understanding CPU Model Options in Harvester

Harvester allows the CPU model to be defined in the VM specification.

If `host-passthrough` is used, the VM exposes the exact host CPU to the guest. This provides maximum performance but completely prevents migration across different CPU generations.

If `host-model` is used, the VM derives a CPU model based on the host’s capabilities. This works only when all nodes expose identical CPU features. In mixed clusters, this setting commonly causes migration failures.

If an explicit CPU model is defined, the VM exposes a named CPU architecture defined by QEMU. This is the recommended approach for clusters that may contain different CPU generations.
For mixed environments, an explicit CPU model should always be used.

## Choosing a CPU Model for Live Migration

When selecting a CPU model, the goal is to choose the highest common denominator. This means the most modern CPU architecture that every node in the cluster supports. Pick a model supported by all nodes in your cluster, including the oldest CPU generation. Use a server-grade model that provides a reasonable set of capabilities (e.g., vector instructions, security features) without tying VMs to host-specific features. Use the same model on all VMs that need live migration.

Below are practical examples for common enterprise hardware combinations.

For a cluster that mixes Cascade Lake and Sapphire Rapids, the recommended CPU model is `Cascadelake-Server`. Sapphire Rapids processors are backward compatible with Cascade Lake instructions, making `Cascadelake-Server` the highest common denominator between these two generations.

For a cluster that mixes Skylake and Cascade Lake nodes, the appropriate model is `Skylake-Server`. This is the common ground between both generations. Cascade Lake includes additional AVX-512 optimizations, but using Skylake ensures compatibility across the entire cluster.

If your cluster contains Broadwell nodes along with anything newer, the safest baseline is `Broadwell`. Broadwell serves as a stable and widely supported baseline for older enterprise hardware. Any newer CPUs will support it.

## Set Up Cluster-Wide Configuration

If your virtual machines run only on a specific CPU model, you can set up a cluster-wide CPU model in the `kubevirt` resource.

You can edit it with `kubectl edit kubevirt kubevirt -n harvester-system`, then add the CPU model you want in the following spec:

```yaml
spec:
  configuration:
    cpuModel: IvyBridge
```

Then, when a new virtual machine starts or an existing virtual machine restarts, the cluster-wide setting will be applied. The system follows these priorities when using CPU models if you configure them in both locations:

1. CPU model in the virtual machine spec.
2. CPU model in the KubeVirt spec.

## References

- [CPU Model Matching](https://docs.harvesterhci.io/v1.6/vm/live-migration/#cpu-model-matching)
- [QEMU / KVM CPU model configuration](https://www.qemu.org/docs/master/system/qemu-cpu-models.html)