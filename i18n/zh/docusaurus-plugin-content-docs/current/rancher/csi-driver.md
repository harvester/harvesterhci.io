---
sidebar_position: 5
sidebar_label: Harvester CSI Driver
title: ""
keywords:
  - Harvester
  - harvester
  - Rancher 集成
---

# Harvester CSI Driver

Harvester CSI Driver 提供了一个 CSI 接口，供 Harvester 中的 Kubernetes 集群使用。这个 CIS 接口连接到主机集群，并将主机卷热插拔到虚拟机来提供本机存储性能。

## 部署

### 前提

- Kubernetes 集群是在 Harvester 虚拟机之上构建的。
- 作为 Kubernetes 节点运行的 Harvester 虚拟机位于相同的命名空间中。

:::note
Currently, the Harvester CSI driver only supports single-node read-write(RWO) volumes. Please follow the [issue #1992](https://github.com/harvester/harvester/issues/1992) for future multi-node `read-only`(ROX) and `read-write`(RWX) support.
:::

### 使用 Harvester RKE1 主机驱动进行部署

- 选择外部云提供商的选项。

- [生成 addon 配置](https://github.com/harvester/harvester-csi-driver/blob/master/deploy/generate_addon.sh)并将它添加到 RKE 配置 YAML 中：

```
# 依赖 kubectl 来操作 Harvester 集群
./deploy/generate_addon.sh <serviceaccount name> <namespace>
```

### 使用 Harvester RKE2 主机驱动进行部署

当使用 Rancher RKE2 主机驱动启动 Kubernetes 集群时，Harvester CSI Driver 会在选择 Harvester 云提供商时被部署。

![select-harvester-cloud-provider](assets/select-harvester-cloud-provider.png)

### 使用 Harvester K3s 主机驱动进行部署

- [生成 addon 配置](https://github.com/harvester/harvester-csi-driver/blob/master/deploy/generate_addon.sh)并放入 K3s 虚拟机 `/etc/kubernetes/cloud-config`。

```
# 依赖 kubectl 来操作 Harvester 集群
./deploy/generate_addon.sh <serviceaccount name> <namespace>
```

- 从 Rancher 应用市场安装 `Harvester CSI Driver`。

   ![](assets/install-harvester-csi-driver-in-k3s.png)
