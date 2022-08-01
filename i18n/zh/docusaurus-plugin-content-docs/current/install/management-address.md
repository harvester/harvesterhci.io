---
sidebar_position: 6
sidebar_label: 管理地址
title: ""
keywords:
  - VIP
Description: Harvester 提供一个虚拟 IP 作为管理地址。
---

# 管理地址
Harvester provides a fixed virtual IP (VIP) as the management address, VIP must be different than any NODE IP.  安装后，你可以在控制台仪表盘上找到管理地址。

:::note
If you selected the IP address to be configured via DHCP, you will need to configure static MAC-to-IP address mapping on your DHCP server in order to have a persistent Virtual IP
:::

![](./assets/iso-installed.png)

## 如何获取 VIP MAC 地址

要获取 VIP MAC 地址，在管理节点上运行以下命令：
```shell
$ kubectl get svc -n kube-system ingress-expose -ojsonpath='{.metadata.annotations}'
```

输出示例：
```json
{"kube-vip.io/hwaddr":"02:00:00:09:7f:3f","kube-vip.io/requestedIP":"10.84.102.31"}
```

## 用途
管理地址有两个用途：

- 允许通过 `HTTPS` 协议访问 Harvester API/UI。
- 作为其他节点加入集群的地址。
   ![](./assets/configure-management-address.png)

