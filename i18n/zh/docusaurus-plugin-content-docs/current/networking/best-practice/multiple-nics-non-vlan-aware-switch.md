---
sidebar_position: 3
sidebar_label: 具有非 VLAN 感知交换机的多个 NIC
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

# Mulitple NICs with Non VLAN-aware Switch

在此“非 VLAN 感知”交换机（也称为“虚拟”交换机）的最佳实践指南中，我们将介绍常见场景下的 Harvester VLAN 网络和外部交换机配置。

## 架构

硬件：

- Three Harvester servers with dual ports network card.
- 一个或多个“非 VLAN 感知”交换机。

网络规格：

- 主机和 VM 网络位于同一子网中。

布线：

- The Harvester servers are connected to the switch in a port from `1` to `6`.

下图说明了本指南所用的布线：

![mulitple-nics-non-vlan-aware.png](assets/mulitple-nics-non-vlan-aware.png)

## 外部交换机配置

通常情况下，我们无法配置“非 VLAN 感知”交换机。

## 在 Harvester 中创建 VLAN 网络

You can create a new VLAN network on the **Advanced > Networks** page, and click the **Create** button.

Specify the name and a VLAN ID that you want to create for the VLAN network <small>(You can specify the same VLAN ID in different namespaces if you have [Rancher multi-tenancy](../../rancher/virtualization-management.md#多租户) configured)</small>.
![create-vlan-network.png](assets/create-network.png)

### 将 VM 连接到 Harvester 主机的子网

“非 VLAN 感知”交换机只会将未标记的网络流量发送到 Harvester 主机的子网。在 Harvester 中，未标记的流量在 VLAN 1 中接收。

如果需要将 VM 连接到 Harvester 主机的子网，则必须在 Harvester 中创建一个 VLAN ID 为 1 的 VLAN 网络。

![mulitple-nics-non-vlan-aware-vlan1.png](assets/mulitple-nics-non-vlan-aware-vlan1.png)

有关 Harvester 网络的更多信息，请参阅[此页面](../harvester-network.md)。

:::note
If you create a VLAN Network different from `1`, the connection between VMs in different nodes will fail.
:::
