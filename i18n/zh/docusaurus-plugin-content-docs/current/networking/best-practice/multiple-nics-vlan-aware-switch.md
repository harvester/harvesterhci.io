---
sidebar_position: 2
sidebar_label: 具有 VLAN 感知交换机的多个 NIC
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

# 具有 VLAN 感知交换机的多个 NIC

在此“VLAN 感知”交换机配置的最佳实践指南中，我们将介绍常见场景下的 Harvester VLAN 网络和外部交换机配置。

## 架构

硬件：

- Three Harvester servers with daul ports network card.
- 一个或多个 VLAN 感知交换机。我们将使用类似 Cisco 的配置作为示例。

网络规格：

- 假设 Harvester 主机的子网在 VLAN 100 中。
- 假设 VM 在 VLAN 101-200 中。

布线：

- The Harvester servers are connected to the switch in a port from `1` to `6`.

下图说明了本指南所用的布线：

![mulitple-nics-vlan-aware.png](assets/mulitple-nics-vlan-aware.png)

## 外部交换机配置

For the external switch configuration, we'll use a "Cisco-like" configuration as an example. 你可以将以下配置应用于你的交换机：


For `harvester-mgmt` ports:
```
switch# config terminal
switch(config)# interface ethernet1/<Port Number>
switch(config-if)# switchport
switch(config-if)# switchport mode access
switch(config-if)# switchport access 100
switch(config-if)# no shutdown
switch(config-if)# end
switch# copy running-config startup-config
```

:::note
In this case, you need to avoid using `harvester-mgmt` as the VLAN Network interface. This setting will only allow the traffic in the same subnet of `harvester-mgmt` and disallow other VLAN traffic.
:::

For VLAN network ports:
```
switch# config terminal
switch(config)# interface ethernet1/<Port Number>
switch(config-if)# switchport
switch(config-if)# switchport mode trunk
switch(config-if)# switchport trunk allowed vlan 100-200
switch(config-if)# switchport trunk native vlan 1
switch(config-if)# no shutdown
switch(config-if)# end
switch# copy running-config startup-config
```

:::note
We use the VLAN Trunk setup to set up the network ports for the VLAN Network. In this case, you can simply set VLAN 100 for the VMs in the Harvester VLAN network to connect to the same subnet of `harvester-mgmt`.
:::

## 在 Harvester 中创建 VLAN 网络

你可以前往 **Advanced > Networks** 页面，然后点击 **Create** 按钮，来创建一个新的 VLAN 网络。

Specify the name and a VLAN ID that you want to create for the VLAN network <small>(You can specify the same VLAN ID in different namespaces if you have [Rancher multi-tenancy](../../rancher/virtualization-management.md#多租户) configured)</small>.

![create-vlan-network.png](assets/create-network.png)

### 将 VM 连接到 Harvester 主机的子网

完成上一节中的配置后，外部交换机会将未标记的网络流量发送到 Harvester 主机的子网。在 Harvester 中，未标记的流量在 VLAN 1 中接收。

Therefore, if you need VMs to connect to the VLAN ID 1, you need to create a VLAN ID 1 Network in Harvester also.

:::note
We strongly recommend against using VLAN 1 in this scenario.
:::

### 将 VM 连接到特定 VLAN 网络

You need to create a VLAN network with a specific VLAN ID and associate the VM with that VLAN network.

有关 Harvester 网络的更多信息，请参阅[此页面](../harvester-network.md)。
