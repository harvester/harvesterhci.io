---
sidebar_position: 1
sidebar_label: 监控
title: ""
---

# 监控

_从 v0.3.0 起可用_

## 仪表盘指标
Harvester `v0.3.0` 已使用 [Prometheus](https://prometheus.io/) 内置集成监控。监控会在 ISO 安装期间自动安装。

在 Harvester 的`仪表盘`页面中，你可以分别查看集群指标以及最常用的 10 个虚拟机指标。
此外，你可以单击 [Grafana](http://grafana.com/) 仪表盘链接，从而在 Grafana UI 上查看更多仪表盘。
![](./assets/monitoring-dashboard.png)

:::note
只有管​​理员用户才能查看仪表盘指标。
:::


## 虚拟机详细指标
你可以单击虚拟机的详情页面来查看每个虚拟机的指标。
![](./assets/vm-metrics.png)

:::note
`内存使用率`的计算公式是 `(1 - 剩余/总量) x 100%`，而不是 `(已使用/总量) x 100%`。
:::

例如，在 Linux 操作系统中，`free -h` 命令输出当前内存的统计信息：

```
$ free -h
              total        used        free      shared  buff/cache   available
Mem:          7.7Gi       166Mi       4.6Gi       1.0Mi       2.9Gi       7.2Gi
Swap:            0B          0B          0B
```

The corresponding `Memory Usage` is `(1 - 4.6/7.7) * 100%`, roughly `40%`.


## Change resources setting of Monitoring
_Available as of v1.0.1_

The `Monitoring` has a couple of components to collect metrics data from all NODEs/PODs/VMs/... and summarize them. The resources required by the `Monitoring` are related to workloads and hardware resources. Harvester sets the default values according to engineering practices, and you can change them accordingly.

The following two components `resources settings` are available:

(1) Monitoring-Prometheus

(2) Monitoring-Prometheus-node-exporter

### Change resources settings of Monitoring-Prometheus

#### From WebUI

In the `Advanced Settings` page, you can view and change the resources settings as follow:

(1) Navigate to settings page, find `harvester monitoring`.
![](./assets/monitoring-setting.png)

(2) Click `Show harvester-monitoring` to view the current values.
![](./assets/monitoring-setting-view-current.png)

(3) Click in the up-right corner pop up menu and select `Edit Setting` to set a new value.
![](./assets/monitoring-setting-edit-config.png)

(4) Click `Save`. The `Monitoring` will be restarted with the new resources settings. Please note, the restart can take some time.

The most frequently used option is memory setting.

`Requested Memory` is the minimum memory of the `Monitoring`. The recommended value is about 5% to 10% of system memory of one single management node. A value less than 500Mi will be denied.

`Memory Limit` is the maximum memory of the `Monitoring`. The recommended value is about 30% of system memory of one single management node, when the `Monitoring` reaches this value, it will be restarted.

Depending on the available hardware resources and system loads, you may change the settings accordingly.

:::note
If you have multiple management nodes with different hardware resources, please set the value based on the smaller one.
:::

#### From CLI

To update the values, you may use the CLI command: `kubectl edit managedchart rancher-monitoring -n fleet-local`.

In v1.0.1 and later versions, the related path and default value are:

`spec.values.prometheus.prometheusSpec.resources.limits.cpu`:`1000m`

`spec.values.prometheus.prometheusSpec.resources.limits.memory`:`2500Mi`

`spec.values.prometheus.prometheusSpec.resources.requests.cpu`:`750m`

`spec.values.prometheus.prometheusSpec.resources.requests.memory`:`1750Mi`

In v1.0.0 and ealier versions, the related path and default value are not in the `managedchart rancher-monitoring`, you need to add them accordingly.

### Change resources settings of Monitoring-Prometheus-node-exporter

`Monitoring-Prometheus-node-exporter` has a similar resources specifications as `Monitoring-Prometheus`.

#### From WebUI

_Available as of v1.0.2_

Follow the steps described in previous chapter `Change resources settings of Monitoring-Prometheus` `From WebUI`, after selecting `Edit Setting`, the page will be shown as:
![](./assets/monitoring-setting-edit-config-v1.0.2.png)

#### From CLI

To update the values, you may use the CLI command: `kubectl edit managedchart rancher-monitoring -n fleet-local`.

In v1.0.1 and later versions, the related path and default value are:

`spec.values.prometheus-node-exporter.resources.limits.cpu`:`200m`

`spec.values.prometheus-node-exporter.resources.limits.memory`:`180Mi`

`spec.values.prometheus-node-exporter.resources.requests.cpu`:`100m`

`spec.values.prometheus-node-exporter.resources.requests.memory`:`30Mi`

In v1.0.0 and ealier versions, the related path and default value are not in the `managedchart rancher-monitoring`, you need to add them accordingly.

:::note
When many VMs are deployed in one NODE, the OOM(out of memory)/abnormal restarting of prometheus-node-exporter POD(s) may be observed. In that case, you should change the `limits.memory` to a bigger value.
:::

### 故障排除

如果你在使用 Monitoring 时遇到问题，请参阅[故障排除](../troubleshooting/monitoring.md)。

