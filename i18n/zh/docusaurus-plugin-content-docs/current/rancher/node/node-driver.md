---
sidebar_position: 1
sidebar_label: "Harvester 主机驱动"
title: ""
keywords:
  - Harvester
  - harvester
  - Rancher
  - rancher
  - Harvester 主机驱动
Description: Harvester 主机驱动用于在 Harvester 集群中配置虚拟机。在本节中，你将学习如何配置 Rancher 以使用 Harvester 主机驱动来启动和管理 Kubernetes 集群。
---

# Harvester 主机驱动

Harvester 主机驱动用于在 Harvester 集群中配置虚拟机。在本节中，你将学习如何配置 Rancher 以使用 Harvester 主机驱动来启动和管理 Kubernetes 集群。

主机驱动的设计与 [Docker Machine Driver](https://docs.docker.com/machine/) 相同，它的项目仓库位于 [harvester/docker-machine-driver-harvester](https://github.com/harvester/docker-machine-driver-harvester)。

你可以使用内置的 Harvester 主机驱动在 Rancher `2.6.3` 中配置 RKE1/RKE2 Kubernetes 集群。
此外，Harvester 可以为 Kubernetes 集群提供内置的[负载均衡器](../cloud-provider.md)以及原始集群[持久存储](../csi-driver.md)支持。

虽然你可以中[在 Harvester UI 中上传和查看 `.ISO` 镜像](../../upload-image.md#通过本地文件上传镜像)，但 Rancher UI 不支持此功能。有关更多信息，请参阅 [Rancher 文档](https://rancher.com/docs/rancher/v2.6/en/virtualization-admin/#harvester-node-driver)。

:::note
Harvester 1.0.0 仅与 Rancher `2.6.3+` 版本兼容。
:::

## Harvester 主机驱动

Rancher `2.6.3+` 版本默认启用 Harvester 主机驱动。你可以前往`集群管理 > 驱动 > 主机驱动`页面手动管理 Harvester 主机驱动。

![](../assets/harvester-node-driver.png)

启用 Harvester 主机驱动后，你可以在 Harvester 集群之上创建 Kubernetes 集群并从 Rancher 管理它们。

![rke1-cluster](../assets/rke1-node-driver.png)

## RKE1 Kubernetes 集群
了解[如何创建 RKE1 Kubernetes 集群](./rke1-cluster.md)。

## RKE2 Kubernetes 集群
了解[如何创建 RKE2 Kubernetes 集群](./rke2-cluster.md)。

## K3s Kubernetes 集群
点击了解[如何创建 k3s Kubernetes 集群](./k3s-cluster.md)。
