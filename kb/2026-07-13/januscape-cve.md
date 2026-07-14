---
title: 'Januscape: Guest-to-Host Escape in KVM/x86 - CVE-2026-53359'
description: 'This article provides information on the CVE-2026-53359 vulnerability in Harvester.'
authors:
  - name: Ivan Sim
    title: Principal Software Engineer
    url: https://github.com/ihcsim
    image_url: https://github.com/ihcsim.png
  - name: Gaurav Mehta
    title: Principal Software Engineer
    url: https://github.com/ibrokethecloud
    image_url: https://github.com/ibrokethecloud.png
tags: [security, cve]
hide_table_of_contents: false
---

This article provides information and mitigation steps for the following vulnerabilities in Harvester:

* CVE-2026-53359

:::info important

On July 6, 2026, researcher Hyunwoo Kim (@v4bel) publicly disclosed Januscape, a vulnerability in the Linux kernel’s KVM/x86 memory-management code, which allows a malicious virtual machine to break out of the guest and run code as root on the host it runs on. On hosts where the KVM device node `/dev/kvm` is world-accessible, an unprivileged local user can exploit the vulnerability to crash the host.

All supported versions of Harvester are affected, including 1.6.1 and earlier, 1.7.2 and earlier, and 1.8.1 and earlier.

Januscape is the latest in a series of Linux kernel privilege-escalation vulnerabilities that required a patch and a reboot on affected hosts.

SUSE is working on fixing this issue. Meanwhile, apply the mitigation steps described in this article to protect your clusters.

:::

The mitigation steps involved disabling the nested virtualization feature of the KVM kernel module on your Harvester hosts.

:::info note

Nested virtualization is not supported on virtual machines running on Harvester. Disabling this feature will not affect the functionality of your Harvester cluster.

:::

On your Harvester hosts, use the following commands to confirm that the KVM kernel module is loaded with nested virtualization enabled:

```sh
lsmod | grep -iE "kvm_amd|kvm_intel"

sudo grep -H '' /sys/module/{kvm_amd|kvm_intel}/parameters/* 2>&1 |grep nested
```

If the above commands return module and parameter information about the KVM kernel module, then your host is affected by this vulnerability.

Deploy the following `CloudInit` configuration to disable the nested virtualization feature of the KVM kernel module on all your Harvester hosts:

```yaml
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: disabled-nested-virtualization
spec:
  matchSelector:
    harvesterhci.io/managed: "true"
  filename: 99-disabled-nested-virtualization
  contents: |
    stages:
        initramfs:
        - name: "disable nested virtualization in kvm modules"
          files:
            - path: "/etc/modprobe.d/99-disabled-nested-virtualization.conf"
              content: |
                options kvm_amd nested=0
                options kvm_intel nested=0
```

Once the configuration is applied, reboot your Harvester hosts for the changes to take effect.

:::info warning

Do not disable the KVM kernel module on your Harvester hosts, as it is required for running virtual machines. Only disable the nested virtualization feature using the configuration provided above.

:::

Once you upgraded to a fixed version of Harvester, you can re-enable the nested virtualization feature by deleting the `CloudInit` configuration and rebooting your Harvester hosts:

```sh
kubectl delete cloudinit disabled-nested-virtualization
```

References:

* <https://support.scc.suse.com/s/kb/Security-Vulnerability-x86-64-kvm-Guest-to-Host-escape-aka-Januscape-CVE-2026-53359>
* <https://www.suse.com/security/cve/CVE-2026-53359.html>
