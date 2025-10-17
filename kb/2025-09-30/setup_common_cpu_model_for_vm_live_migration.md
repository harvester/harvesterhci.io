---
title: Setting up a common CPU model for virtual machine migration
description: 'How to set up a common CPU model for virtual machine migration'
slug: setup_common_cpu_model_for_vm_live_migration
authors:
  - name: Jack Yu
    title: Senior Software Engineer
    url: https://github.com/Yu-Jack
    image_url: https://github.com/Yu-Jack.png
tags: [harvester, virtual machine, VM, live migration, policy, strategy, configuration]
hide_table_of_contents: false
---

## Problem Description

For Harvester to successfully migrate a virtual machine from one node to another, the source and target nodes must have compatible CPU models and features.

If the CPU model of a virtual machine isn't specified, Harvester assigns it the default `host-model` configuration so that the virtual machine has the CPU model closest to the one used on the host node.

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