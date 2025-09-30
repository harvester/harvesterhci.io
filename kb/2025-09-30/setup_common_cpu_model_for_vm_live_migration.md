---
title: Setup a common CPU model for virtual machine migration
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

Although Harvester allows you to perform live migration, it sometimes fails due to mismatched CPU features and models. Let's examine an example.

When a virtual machine is migrated to another node, the following key-value pairs are added under `spec.nodeSelector` in the POD spec.

```yaml
spec:
  nodeSelector:
    cpu-model-migration.node.kubevirt.io/SierraForest: "true"
    cpu-feature.node.kubevirt.io/fpu: "true"
    cpu-feature.node.kubevirt.io/vme: "true"
```

After the first migration, if you migrate the virtual machine again, it will still use the above `nodeSelector` in the POD spec. Migration may fail if another node doesn't have the corresponding features or model. For example:

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

This virtual machine will fail to migrate to node B due to the missing `fpu` feature. However, if the virtual machine doesn't actually require this feature, this failure can be frustrating. Therefore, setting up a common CPU model can resolve this issue.

## How to Set Up a Common CPU Model

In Harvester, we use the default CPU model, which is `host-model`. Using the default CPU model results in the above consequences. However, we can actually set up a customized CPU model in the virtual machine spec to make it migrate successfully.

When setting up a customized CPU model, it will have different key-value pairs under `spec.nodeSelector` in the POD spec. Let's examine this example.

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

If we set up `IvyBridge` as our CPU model in the virtual machine spec, KubeVirt only adds `cpu-model.node.kubevirt.io/xxx` under `spec.nodeSelector` in the POD spec and skip adding `cpu-model-migration.node.kubevirt.io/xxx` and features.

```yaml
# Virtual Machine Spec
spec:
  template:
    spec:
      domain:
        cpu:
          model: IvyBridge

# POD spec
spec:
  nodeSelector:
    cpu-model.node.kubevirt.io/IvyBridge: "true"
```

With this configuration, your virtual machine can be migrated to any nodes that have the label `cpu-model.node.kubevirt.io/IvyBridge`. You don't need to worry about mismatched features or `cpu-model-migration.node.kubevirt.io/xxx` labels.

## Set Up Cluster-Wide Configuration

If your virtual machines only run on a specific CPU model, you can set up a cluster-wide CPU model in the `kubevirt` resource.

You can edit it with `kubectl edit kubevirt kubevirt -n harvester-system`, then add the CPU model you want in the following spec:

```yaml
spec:
  configuration:
    cpuModel: IvyBridge
```

Then, when a new virtual machine starts or an existing virtual machine restarts, it will apply the cluster-wide setting. The system follows these priorities when using CPU models if you configure them in both locations:

1. CPU model in virtual machine spec.
2. CPU model in kubevirt spec.


## References

- [CPU Model Matching](https://docs.harvesterhci.io/v1.6/vm/live-migration/#cpu-model-matching)