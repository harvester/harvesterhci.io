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

In the testing environment, guest virtual machines experienced severely degraded download and transfer speeds, dropping as low as 100 bps. This extreme slowdown was particularly evident when `apt-get update`, `curl`, and `scp` were used to transfer data between virtual machines running on different nodes. In contrast, performance remained normal when the virtual machines were hosted on the same node.

### Environment

The issue was observed in a Harvester cluster hosted on Dell servers using Broadcom NetXtreme-E Series BCM57508 NICs (100 Gbps). `mgmt`, the built-in cluster network, was used for both management and virtual machine traffic.

## Cause

### Root Cause

Harvester relies on Linux’s bridge-based virtual networking to connect guest virtual machines to physical networks.

The NetXtreme-E BCM57508 NICs were connected to leaf switches configured to transmit jumbo frames. When the default MTU of `1500` is used, these frames should ideally be segmented to approximately 1450 bytes before reaching the Harvester host kernel. However, the packets actually arriving at the kernel were fragmented into unexpectedly small sizes. This forced the kernel to process a significantly higher volume of packets, leading to increased CPU overhead and reduced download throughput.

Packets captures collected using the following command confirmed the unexpectedly small size of the incoming packets.

```
tcpdump -xx -i <interface-name>

<interface-name> is the name of the physical interface on the host connected to the VMs.
```

### GRO/GSO offload

Generic Receive Offload (GRO) and Generic Segmentation Offload (GSO) are kernel-level software offloading mechanisms designed to optimize network performance. GRO aggregates multiple small incoming packets into larger ones before passing them to the network stack. GSO performs the opposite on transmission, splitting large packets into smaller frames before sending them to the NIC.

While these features are typically used to enhance performance, in this specific scenario, they interfered with the normal TCP segmentation process. This interference led to inefficient packet segmentation and the creation of an excessive number of small fragments, which ultimately degraded overall network performance.

When GRO and GSO were disabled, the Linux network stack automatically reverted to using standard transport-layer segmentation methods, specifically TCP Segmentation Offload (TSO) and Large Receive Offload (LRO). These mechanisms maintained efficient packet aggregation and segmentation at the appropriate layers, ensuring properly sized packets were presented to the kernel, which successfully restored expected network performance.

The NetXtreme-E BCM57508 NICs may experience suboptimal interaction with GRO and GSO due to a Broadcom driver bug. Enabling these offload mechanisms led to inefficient packetization, producing many small packets instead of fewer large ones, which ultimately reduced network throughput.

## Solution

- Option 1: Disable GRO and GSO on the affected Harvester host interfaces. This change does not persist across reboots.

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