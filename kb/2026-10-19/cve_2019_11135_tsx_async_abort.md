---
title: "CVE-2019-11135: TSX Asynchronous Abort"
description: 'How to resolve virtual machine start failures caused by the CVE-2019-11135 mitigation'
slug: cve_2019_11135_tsx_async_abort
authors:
  - name: Jack Yu
    title: Senior Software Engineer
    url: https://github.com/Yu-Jack
    image_url: https://github.com/Yu-Jack.png
tags: [harvester, virtual machine, VM, live migration, CPU model, CVE, configuration]
hide_table_of_contents: false
---

## Description

On a cluster configured with a CPU model such as `cpu-model.node.kubevirt.io/Cascadelake-Server=true`, virtual machines may no longer start after an upgrade to Harvester v1.7.3.

The mitigation for CVE-2019-11135 disables TSX on affected CPUs. As a result, the `hle` and `rtm` CPU features are missing on those nodes, and virtual machines that require them cannot start.

For details about CVE-2019-11135, see the [Intel Security Advisory](https://www.intel.com/content/www/us/en/security-center/advisory/intel-sa-00270.html). To check whether a processor is affected, refer to Intel's [list of affected processors](https://www.intel.com/content/www/us/en/developer/topic-technology/software-security-guidance/processors-affected-consolidated-product-cpu-model.html#tab-blade-1-2) and search for `CVE-2019-11135`.

## Resolution

Following the check described in [Red Hat's TAA advisory](https://access.redhat.com/articles/tsx-asynchronousabort), check the TAA status on each node by running:

```bash
cat /sys/devices/system/cpu/vulnerabilities/tsx_async_abort
```

If the output reports `Vulnerable`, use the corresponding CPU model ending in `-noTSX` (for example, `Skylake-Server-noTSX` or `Cascadelake-Server-noTSX`) to disable TSX for the virtual machine. Interpret other output according to your operating system's security guidance. Make sure the selected model is supported by every node where the virtual machine may run.

Alternatively, configure `Cascadelake-Server-v3` or a later version as the CPU model. After changing the CPU model, restart all affected virtual machines.

For more information about choosing and configuring a common CPU model, see [Setting up a common CPU model for virtual machine migration](../2025-09-30/setup_common_cpu_model_for_vm_live_migration.md).

## References

- [harvester/harvester#11784](https://github.com/harvester/harvester/issues/11784)
- [CVE-2019-11135 - TSX Asynchronous Abort (Red Hat)](https://access.redhat.com/articles/tsx-asynchronousabort)
- [Setting up a common CPU model for virtual machine migration](../2025-09-30/setup_common_cpu_model_for_vm_live_migration.md)
