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

## Issue

Node selector constraints can prevent the scheduler from live-migrating a virtual machine to a target node. This often indicates a mismatch between the virtual machine's requirements and the node's capabilities.

A node selector may require a specific CPU feature, but the target node lacks the corresponding label (for example, `cpu-feature.node.kubevirt.io/fpu: "true"`). This mismatch can occur when the `host-model` CPU models and features computed by KubeVirt change over time.

## Solutions

You can resolve this issue using four different approaches.

- Reboot the virtual machine.

    KubeVirt automatically adds node selectors (during a previous migration or initial start) that can restrict scheduling. You can clear these node selectors by rebooting the virtual machine.

- Reboot the virtual machine and set up a common CPU model.

    You can override KubeVirt's default `host-model` CPU configuration by [setting up a common CPU model for virtual machine migration](../2025-09-30/setup_common_cpu_model_for_vm_live_migration.md). The model is applied to the virtual machine as its domain CPU, and to the pod as its node selector configuration.

    This is the recommended approach for environments that can tolerate restarting of virtual machines.

- Modify the node labels.

    If rebooting the virtual machine is not an option, you can manually manipulate the target node's labels to satisfy the scheduling requirements.

    1. Add the `node-labeller.kubevirt.io/skip-node="true"` annotation to the target node.

        This annotation, which persists even after upgrades, prevents KubeVirt's `node-labeller` from automatically adding or removing CPU-related labels on this node.

        ```bash
        kubectl annotate node <node-name> node-labeller.kubevirt.io/skip-node="true"
        ```
        
        :::info important

        The annotation itself does not affect the pod's node selector. It only controls the presence of specific CPU-related labels on the node, which the node selector checks against. For more information, see the [References](#references) section.

        :::

    1. Identify labels that are missing from the virtual machine's node selector and add them to the target node.

        You can add the missing labels using the following command:

        ```bash
        kubectl label node <node-name> <key>=<value>
        ```

        This circumvents the standard scheduling restrictions, allowing the virtual machine to migrate to the target node.

    If a new node that lacks the required features is added to the cluster, you must repeat these steps to allow the virtual machine to live-migrate to that node.

- Remove the node labels.

    If you want to ensure that the virtual machine does not acquire specific node selector constraints after live migration, you can remove the [relevant CPU labels](#kubevirt-node-labels) from the target node.

    1. Add the `node-labeller.kubevirt.io/skip-node="true"` annotation to the target node.

        This annotation, which persists even after upgrades, prevents KubeVirt's `node-labeller` from automatically adding or removing CPU-related labels on this node.

        ```bash
        kubectl annotate node <node-name> node-labeller.kubevirt.io/skip-node="true"
        ```

        :::info important

        This method works only if the virtual machine's pod does not have an existing node selector that contains the labels listed in the [References](#references) section. Otherwise, you must reboot the virtual machine to clear the constraints.

        :::

    1. Check if the pod has a node selector.

        ```bash
        kubectl get pod <pod-name> -o yaml | grep nodeSelector -A 5 -B 5
        ```

    1. If no node selector exists, remove the relevant [CPU labels](#kubevirt-node-labels) from the node.

        Performing this action prevents the pod from acquiring new node selector constraints, thus enabling its future migration to other nodes. However, the successful outcome of that migration is not guaranteed.

## References

### KubeVirt Node Labels

The KubeVirt CPU node-labeller manages the following labels:

- `cpu-feature.node.kubevirt.io/*`
- `cpu-model-migration.node.kubevirt.io/*`
- `cpu-model.node.kubevirt.io/*`
- `host-model-cpu.node.kubevirt.io`
- `host-model-required-features.node.kubevirt.io`

### External Links

- [Labeling nodes with CPU models, CPU features and machine types](https://kubevirt.io/user-guide/compute/virtual_hardware/#labeling-nodes-with-cpu-models-cpu-features-and-machine-types)
