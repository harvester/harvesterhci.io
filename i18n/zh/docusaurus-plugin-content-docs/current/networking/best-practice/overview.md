---
sidebar_position: 1
sidebar_label: 概述
title: ""
keywords:
  - Harvester
  - harvester
  - Rancher
  - rancher
  - 网络
  - network
  - VLAN
  - vlan
Description: Harvester 构建在 Kubernetes 之上，而 Kubernetes 使用 [CNI](https://github.com/containernetworking/cni) 作为网络提供商和 Kubernetes Pod 网络之间的接口。因此，我们也基于 CNI 实现 Harvester 网络。此外，Harvester UI 集成了网络配置，来实现用户友好的虚拟机网络配置。
---

# 概述

In a real production environment, we generally recommend that you have multiple NICs in your machine, one for node access and one for VM networking. If your machine has multiple NICs, please refer to [multiple NICs](multiple-nics-vlan-aware-switch.md) for best practices. Otherwise, please refer to [Single NIC](single-nic-vlan-aware-switch.md) best practice.

:::note
If you configure a `bond` interface with multiple NICs, please refer to the single NIC scenario, unless the Harvester node has multiple `bond` interfaces.
:::

## 最佳实践

- [Multiple NICs with VLAN-aware switch](multiple-nics-vlan-aware-switch.md)
- [Multiple NICs with non VLAN-aware switch](multiple-nics-non-vlan-aware-switch.md)
- [Single NIC with VLAN-aware switch](single-nic-vlan-aware-switch.md)
- [Single NIC with non VLAN-aware switch](single-nic-non-vlan-aware-switch.md)
