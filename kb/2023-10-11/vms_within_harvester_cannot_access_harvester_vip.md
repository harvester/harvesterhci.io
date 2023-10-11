---
title: VMs within Harvester cannot access Harvester VIP for HTTP and HTTPS
description: How to allow the VMs created in Harvester to reach the Harvester VIP via HTTP/HTTPS
slug: vms_within_harvester_cannot_access_harvester_vip
authors:
  - name: Giovanni Lo Vecchio
    title: Rancher Kubernetes Engineer - Emerging Products
    url: https://github.com/glovecchi0
    image_url: https://github.com/glovecchi0.png
tags: [harvester, network, configuration-as-code]
hide_table_of_contents: false
---

## Environment
Harvester 1.2.x and lower.

## Situation
It may happen that the VMs started in Harvester fail to connect to the Harvester VIP (Virtual-IP) itself.
The same happens if integrated with Rancher; the VM cannot connect to the VIP Rancher uses as Ingress.

While the [issue](https://github.com/harvester/harvester/issues/3960) is being worked on, a workaround has been implemented.

## Resolution
Change the `net.bridge.bridge-nf-call-iptables` parameter from 1 to 0.

To update Harvester configurations, you must first update the runtime value in the system and then update configuration files to make the changes persistent between reboots.
Refer [here](https://docs.harvesterhci.io/v1.2/install/update-harvester-configuration/#configuration-persistence).


In this specific case, the steps to follow are:

1. Set the variable `net.bridge.bridge-nf-call-iptables` to zero directly on the nodes.

```
sysctl -w net.bridge.bridge-nf-call-iptables=0
```

2. Backup the elemental `cloud-init` file `/oem/90_custom.yaml`.

```
cp /oem/90_custom.yaml /oem/install/90_custom.yaml.$(date --iso-8601=minutes)
```

3. Edit `/oem/90_custom.yaml` and update the yaml path **.stages.initramfs[0].files**.

CONTROL PLANE NODES ->
```
    - path: /etc/systemd/system/rke2-server.service.d/bridge.conf
      permissions: 448
      owner: 0 
      group: 0
      content: |
        [Service]
        ExecStartPost=/sbin/sysctl -w net.bridge.bridge-nf-call-iptables=0
      encoding: ""
      ownerstring: ""
```

WORKER NODES ->
```
    - path: /etc/systemd/system/rke2-agent.service.d/bridge.conf
      permissions: 448
      owner: 0 
      group: 0
      content: |
        [Service]
        ExecStartPost=/sbin/sysctl -w net.bridge.bridge-nf-call-iptables=0
      encoding: ""
      ownerstring: ""
```

4. Turn the nodes off and on again.

5. Verify that the configuration was applied correctly.

```
sudo sysctl -a | grep net.bridge.bridge-nf-call-iptables
```
