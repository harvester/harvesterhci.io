---
title: Harvester VM Network Slowness when Bare Metal servers have Broadcom-57508-NetExtreme NIC – GRO/GSO Offload Issue
description: 'Reason for VM Network slowness and how to fix it by disabling GRO/GSO offload caused by some specific NICs'
slug: disable_gro_gso_offload
authors:
  - name: Renuka Devi Rajendran
    title: Senior Software Engineer
    url: https://github.com/rrajendran17
    image_url: https://github.com/rrajendran17.png
tags: [vm network, performance]
hide_table_of_contents: false
---

When guest virtual machines running on Harvester nodes experience very slow network throughput, disabling Generic Receive Offload (GRO) and Generic Segmentation Offload (GSO) on the host interfaces may resolve the issue.

## Problem

### Symptoms

- Guest VMs exhibited very slow download and transfer speeds (as low as 100 bps).
- apt-get update, curl, and scp between VMs across nodes were extremely slow.
- Performance was normal between VMs running on the same node.

### Environment

- Harvester cluster with Dell Servers using BCM57508 NetXtreme-E NICs.
- VM and management traffic shared the same management cluster network.
- Physical NICs were 100 Gbps interfaces.

## Cause

### Root Cause

Harvester relies on Linux’s bridge-based virtual networking to connect guest VMs to physical networks.

The BCM57508 NetXtreme-E NICs were connected to leaf switches that were transmitting Jumbo Frames. These frames should typically be segmented to around ~1450 bytes before reaching the Harvester host kernel when MTU is configured with default value of 1500. However, the packets arriving at the kernel were fragmented into much smaller sizes than expected. This resulted in the kernel having to process a significantly higher number of packets, increasing CPU overhead and causing reduced download throughput.Packet captures collected using the command below confirmed that the packets were of smaller size:

```
tcpdump -xx -i <interface-name>

<interface-name> is the name of the physical interface on the host connected to the VMs.
```

### GRO/GSO offload

GRO (Generic Receive Offload) and GSO (Generic Segmentation Offload) are kernel-level software offloading mechanisms designed to optimize network performance.

GRO aggregates multiple small incoming packets into larger ones before passing them to the network stack.

GSO performs the opposite on transmission, splitting large packets into smaller frames before sending them to the NIC.


While these features generally enhance performance, in this case they interfered with the normal TCP segmentation process. This caused inefficient packet segmentation and an excessive number of small fragments, degrading overall network performance.

When GRO/GSO were disabled, the Linux network stack reverted to relying on standard transport-level segmentation methods such as TSO (TCP Segmentation Offload) and LRO (Large Receive Offload). These mechanisms maintained efficient packet aggregation at different layers, resulting in properly sized packets being handled by the kernel, which restored expected network performance.

BCM57508 NetXtreme-E NICs may not interact optimally with GRO/GSO due to a broadcom driver bug. In such cases, enabling these offloads can lead to suboptimal packetization behavior,producing many small packets rather than fewer large ones—ultimately reducing throughput.

## Solution

Option 1: The setting does not persist across reboots.

Disable GRO and GSO on the affected Harvester host interfaces.

```
# Check current offload settings
/usr/sbin/ethtool -k <interface-name>

# Disable GRO and GSO
/usr/sbin/ethtool -K <interface-name> gro off
/usr/sbin/ethtool -K <interface-name> gso off

```

Option 2: The setting persists across reboots.

Apply the following cloudinit resource and reboot the nodes.

```
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: disable-offloads
spec:
  matchSelector: {}
  filename: 99_disable_offloads.yaml
  contents: |
    stages:
        network:
            - commands:
                - /usr/sbin/ethtool -K <interface-name>> gro off
                - /usr/sbin/ethtool -K <interface-name>> gso off

```
interface-name is the name of the physical interface on the host connected to the VMs.

## Verification

- Perform apt-get update or curl from a guest VM and throughput should now be normal (utilizing most of the link capacity).
- Test VM-to-VM file transfers across nodes using scp and transfers complete at expected speed.
- Confirm no packet drops or errors using:
  ```
  ip -s link show <interface-name>
  ```