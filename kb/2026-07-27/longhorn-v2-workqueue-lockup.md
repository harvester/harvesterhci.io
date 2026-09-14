---
title: Longhorn V2 Data Engine Kernel Workqueue Lockup
description: 'How to identify and mitigate kernel workqueue lockups after enabling the Longhorn V2 Data Engine in Harvester'
slug: longhorn-v2-workqueue-lockup
authors:
  - name: Cooper Tseng
    title: Senior Software Engineer
    url: https://github.com/brandboat
    image_url: https://github.com/brandboat.png
tags: [longhorn, storage, v2 data engine, troubleshooting]
hide_table_of_contents: false
---

Enabling the Longhorn V2 Data Engine can cause kernel workqueue lockups on some Harvester nodes, leading to system instability. In severe cases, `rke2-server` terminates, Longhorn stops processing operations, and affected nodes require recovery.

This issue typically occurs when SPDK is pinned to dedicated CPUs, but the Linux kernel continues running IRQ handlers or unbound workqueue workers on those same CPUs.

:::caution

The mitigation measure described in this article modifies node-wide host CPU affinity for IRQs and kernel workqueues, which can affect all workloads running on the host. Apply this workaround only to nodes running the Longhorn V2 Data Engine, and carefully validate your target CPU mask before making host-level changes.

:::

## Affected Scenario

This issue can affect Harvester clusters that meet all of the following conditions:

- The Longhorn V2 Data Engine is enabled.
- The Longhorn V2 `instance-manager` pod runs SPDK (`spdk_tgt`), which busy-polls the CPUs specified in the Longhorn V2 Data Engine CPU mask.
- Host IRQ handlers or unbound kernel workqueues are permitted to run on those same SPDK-designated CPUs.

While the default Longhorn V2 CPU mask is `0x3` (maps to CPUs `0` and `1`), this issue can occur with any CPU mask if kernel IRQs or unbound workqueues share the CPUs used by `spdk_tgt`.

This issue primarily affects bare-metal Harvester nodes running the Longhorn V2 Data Engine. Reproducibility varies depending on hardware and workload patterns.

## Symptoms

Affected nodes may exhibit one or more of the following symptoms:

- Kernel logs repeatedly report `BUG: workqueue lockup`.
- The lockup message references a CPU core assigned to the Longhorn V2 Data Engine CPU mask.
- `rke2-server` becomes unstable or terminates without a clear user-visible reason.
- Longhorn volumes, engines, replicas, or instance managers stop progressing.
- Interactive user commands, such as `sudo -i`, experience severe latency before opening a shell.
- The node becomes unstable or unhealthy.

Example of kernel log records:

```text
Jul 27 07:27:55 hp-114-tink-system kernel: BUG: workqueue lockup - pool cpus=0 node=0 flags=0x0 nice=0 stuck for 2117s!
Jul 27 07:27:55 hp-114-tink-system kernel: Showing busy workqueues and worker pools:
Jul 27 07:27:55 hp-114-tink-system kernel: workqueue events: flags=0x0
Jul 27 07:27:55 hp-114-tink-system kernel:   pwq 2: cpus=0 node=0 flags=0x0 nice=0 active=7 refcnt=8
Jul 27 07:27:55 hp-114-tink-system kernel:     in-flight: 2935011:output_poll_execute ,32008:drm_fb_helper_damage_work drm_fb_helper_damage_work
Jul 27 07:27:55 hp-114-tink-system kernel:     pending: vmstat_shepherd, switchdev_deferred_process_work, rht_deferred_worker, key_garbage_collector
Jul 27 07:27:55 hp-114-tink-system kernel: workqueue events_unbound: flags=0x2
Jul 27 07:27:55 hp-114-tink-system kernel:   pwq 98: cpus=0-23 node=1 flags=0x4 nice=0 active=4 refcnt=8
Jul 27 07:27:55 hp-114-tink-system kernel: workqueue events_power_efficient: flags=0x80
Jul 27 07:27:55 hp-114-tink-system kernel:   pwq 2: cpus=0 node=0 flags=0x0 nice=0 active=4 refcnt=5
Jul 27 07:27:55 hp-114-tink-system kernel:     pending: neigh_managed_work, neigh_periodic_work, gc_worker [nf_conntrack], check_lifetime
Jul 27 07:27:55 hp-114-tink-system kernel: pool 2: cpus=0 node=0 flags=0x0 nice=0 hung=2117s workers=5 idle: 1025200 1541794
Jul 27 07:27:55 hp-114-tink-system kernel: task:kworker/0:0     state:R  running task     stack:0     pid:32008 tgid:32008 ppid:2      flags:0x00004000
Jul 27 07:27:55 hp-114-tink-system kernel: Workqueue: events drm_fb_helper_damage_work
Jul 27 07:28:12 hp-114-tink-system rke2[2909320]: time="2026-07-27T07:28:12Z" level=warning msg="Proxy error: write failed: write tcp 127.0.0.1:9345->127.0.0.1:46562: write: connection reset by peer"
```

## Root Cause

The Longhorn V2 Data Engine relies on SPDK, whose reactor threads busy-poll on the CPUs designated by the engine's CPU mask. This continuous polling is expected behavior for high-performance storage processing.

The issue occurs when normal host kernel work continues running on those same CPUs, including the following:

- Network or storage IRQs target SPDK CPUs.
- Unbound kernel workqueues retain SPDK CPUs in `/sys/devices/virtual/workqueue/cpumask`.
- Per-workqueue CPU masks allow existing workers to run on SPDK CPUs.

When SPDK consumes 100% of these CPU cores, pending kernel tasks are starved, eventually triggering the kernel workqueue lockup detector. While isolated lockup warnings may not always result in an unrecoverable node, continuous task starvation cascades into network, RKE2, kubelet, and Longhorn control-plane failure.

To prevent this, all IRQs and kernel workqueues must be explicitly re-routed away from the CPUs defined in the Longhorn V2 CPU mask (for example, CPUs `0` and `1` when using the default mask `0x3`).

## Confirming the Issue

Run the following checks on each affected Harvester node.

### 1. Check Kernel Logs

```shell
journalctl -k --since "24 hours ago" | grep -E "BUG: workqueue lockup|soft lockup"
```

Look for the CPU reported in messages such as `pool cpus=0`, `pool cpus=1`, `kworker/0`, or `kworker/1`.

### 2. Check the Longhorn V2 CPU Mask

```shell
kubectl -n longhorn-system get settings.longhorn.io data-engine-cpu-mask -o jsonpath='{.value}{"\n"}'
```

The value may be data-engine-specific. For example:

```json
{"v2":"0x3"}
```

Some Longhorn versions support CPU-list input for this setting. If the value is already a CPU list, use that list directly in the checks below.

Convert the mask to CPU IDs:

```shell
python3 - <<'PY'
mask = int("0x3", 0)
print(",".join(str(cpu) for cpu in range(mask.bit_length()) if mask & (1 << cpu)))
PY
```

For `0x3`, the output is:

```text
0,1
```

### 3. Check SPDK Placement

```shell
SPDK_PIDS=$(pgrep -f '[s]pdk_tgt' || true)

for pid in ${SPDK_PIDS}; do
  ps -T -p "${pid}" -o pid,tid,psr,stat,pcpu,comm,args
done
```

This command matches the full command line because the SPDK process or its threads may appear as `reactor_<cpu>` in the kernel process name. In that case, `pgrep -x spdk_tgt` can return empty even when `spdk_tgt` is running.

Example output for the default CPU mask `0x3`:

```text
    PID     TID PSR STAT %CPU COMMAND         COMMAND
2913161 2913161   0 RLl  99.9 reactor_0       spdk_tgt -L all --mem-size 2048 -m 0x3
2913161 2913166  21 SLl   0.0 dpdk-intr       spdk_tgt -L all --mem-size 2048 -m 0x3
2913161 2913220   1 RLl  99.9 reactor_1       spdk_tgt -L all --mem-size 2048 -m 0x3
```

The `PSR` column shows the CPU that each thread is running on. In the example above, `reactor_0` is running on CPU `0` and `reactor_1` is running on CPU `1`, so the SPDK CPU list is `0,1`.

To check whether running or blocked kernel workers are currently on the SPDK CPUs, use the following more targeted command. Replace `SPDK_CPUS` with the comma-separated CPU IDs from the `reactor_*` rows.

```shell
SPDK_CPUS="0,1"

ps -eLo pid,tid,psr,stat,pcpu,wchan:30,comm,args | \
  awk -v cpus="${SPDK_CPUS}" '
    BEGIN {
      printf "%7s %7s %3s %-5s %5s %-30s %-16s %s\n", "PID", "TID", "PSR", "STAT", "%CPU", "WCHAN", "COMMAND", "ARGS"
      split(cpus, cpu_list, ",")
      for (i in cpu_list) {
        spdk_cpu[cpu_list[i]] = 1
      }
    }
    NR > 1 && spdk_cpu[$3] && $4 ~ /[RD]/ && ($7 ~ /^kworker\// || $7 ~ /^ksoftirqd\//) {
      print
    }
  '
```

On nodes that are not affected, this command normally prints only the header line. If the header line is removed from the command, empty output is expected. This means there are no running or uninterruptible `kworker/*` or `ksoftirqd/*` threads on the SPDK CPUs at that moment.

Example output showing kernel work on an SPDK CPU:

```text
    PID     TID PSR STAT   %CPU WCHAN                          COMMAND          ARGS
     17      17   0 R     0.0 -                              ksoftirqd/0     [ksoftirqd/0]
  32008   32008   0 R     0.0 -                              kworker/0:0+eve [kworker/0:0+events]
2935011 2935011   0 D     0.0 mgag200_ddc_algo_bit_data_pre_ kworker/0:2+eve [kworker/0:2+events]
4012518 4012518   0 R     0.0 -                              kworker/0:3+mm_ [kworker/0:3+mm_percpu_wq]
```

In this example, the `PSR` value is `0`, and the process names are `ksoftirqd/0` and `kworker/0:*`. This means kernel softirq and workqueue threads are running or blocked on CPU `0`.

If the SPDK reactor threads are running on the CPUs reported in the workqueue lockup, or if the targeted command shows `kworker/*` or `ksoftirqd/*` activity on the SPDK CPUs, continue with the IRQ and workqueue checks.

### 4. Check IRQ Affinity

The following example checks CPUs `0` and `1` because the `reactor_*` rows above are running on those CPUs. Replace `SPDK_CPUS` with the CPU IDs used in your environment.

```shell
SPDK_CPUS="0,1"

cpu_list_overlaps() {
  python3 - "$1" "$2" <<'PY'
import sys

target = {int(cpu) for cpu in sys.argv[1].split(",") if cpu}
seen = set()

for part in sys.argv[2].split(","):
    part = part.strip()
    if not part:
        continue
    if "-" in part:
        start, end = map(int, part.split("-", 1))
        seen.update(range(start, end + 1))
    else:
        seen.add(int(part))

sys.exit(0 if target & seen else 1)
PY
}

for irqdir in /proc/irq/[0-9]*; do
  irq=${irqdir##*/}
  eff=$(cat "${irqdir}/effective_affinity_list" 2>/dev/null || true)
  conf=$(cat "${irqdir}/smp_affinity_list" 2>/dev/null || true)

  if cpu_list_overlaps "${SPDK_CPUS}" "${eff}"; then
    echo "IRQ=${irq} configured=${conf} effective=${eff}"
    grep -w "^ *${irq}:" /proc/interrupts 2>/dev/null || true
  fi
done
```

Example output:

```text
IRQ=108 configured=0-5,12-17 effective=0
 108:   25762242          0 ... IR-PCI-MSIX-0000:04:00.0    3-edge      netboot-TxRx-3
IRQ=109 configured=0-5,12-17 effective=1
 109:          0   15555565 ... IR-PCI-MSIX-0000:04:00.0    4-edge      netboot-TxRx-4
IRQ=120 configured=0-5,12-17 effective=0
 120:   10898692          0 ... IR-PCI-MSIX-0000:04:00.0   15-edge      netboot-TxRx-15
IRQ=121 configured=0-5,12-17 effective=1
 121:          0    8135324 ... IR-PCI-MSIX-0000:04:00.0   16-edge      netboot-TxRx-16
IRQ=92 configured=0 effective=0
  92:    2242087          0 ... IR-PCI-MSIX-0000:08:00.0   13-edge      nvme0q13
IRQ=93 configured=1 effective=1
  93:          0     448454 ... IR-PCI-MSIX-0000:08:00.0   14-edge      nvme0q14
```

The `effective` value shows where the IRQ is actually running. In this example, NIC queues and NVMe queues are effectively landing on CPUs `0` and `1`, which are the default SPDK reactor CPUs for mask `0x3`. If device IRQs, especially high-traffic NIC or storage IRQs, are effectively landing on SPDK CPUs, the node is at risk.

### 5. Check Kernel Workqueue Masks

```shell
cat /sys/devices/virtual/workqueue/cpumask

for f in /sys/devices/virtual/workqueue/*/cpumask; do
  echo "${f}: $(cat "${f}")"
done
```

Example output:

```text
/sys/devices/virtual/workqueue/blkcg_punt_bio/cpumask: ffffff
/sys/devices/virtual/workqueue/ib-comp-unb-wq/cpumask: ffffff
/sys/devices/virtual/workqueue/iscsi_conn_cleanup/cpumask: ffffff
/sys/devices/virtual/workqueue/nvme-auth-wq/cpumask: ffffff
/sys/devices/virtual/workqueue/nvme-delete-wq/cpumask: ffffff
/sys/devices/virtual/workqueue/nvme-reset-wq/cpumask: ffffff
/sys/devices/virtual/workqueue/nvme-wq/cpumask: ffffff
/sys/devices/virtual/workqueue/scsi_tmf_0/cpumask: ffffff
/sys/devices/virtual/workqueue/writeback/cpumask: ffffff
```

On a 24-CPU node, `ffffff` means the workqueue can run on CPUs `0-23`. If SPDK uses the default CPU mask `0x3`, CPUs `0` and `1` are included in this workqueue mask. If the global or per-workqueue masks include the SPDK CPUs, unbound kernel work may still run on the SPDK CPUs.

## Preferred Risk-Reduction Setting

Longhorn added the `data-engine-cpu-isolation-enabled` setting to reduce the chance of this issue. When enabled for the V2 Data Engine, the Longhorn V2 instance-manager:

- Persists the SPDK CPU mask under `/var/lib/longhorn/instance-manager/v2/spdk_cpu_mask` on the host.
- Programs `/proc/irq/*/smp_affinity` to the inverse of the SPDK CPU mask.
- Writes the same inverse mask to `/sys/devices/virtual/workqueue/cpumask`.
- Updates per-workqueue CPU masks when possible.
- Reconciles stale affinity state on the next instance-manager restart if the setting is later disabled.

This setting steers IRQs and unbound workqueues away from SPDK CPUs. In some environments, this may stop the workqueue lockup messages entirely. In others, it may only reduce how often they occur because CPU-bound or per-CPU kernel workers such as `kworker/0:*` are tied to a specific CPU and cannot be moved by the unbound workqueue CPU mask.

Use this setting when the Longhorn version bundled with Harvester includes it. If the Longhorn setting exists but Harvester does not expose it in the UI, you can still configure it through the Longhorn setting resource. For Harvester versions earlier than v1.9.0, the bundled Longhorn version does not include the setting, so use the manual workaround in the next section.

:::caution

The Longhorn setting is a danger-zone setting. It changes host-wide IRQ and workqueue affinity, takes effect only after the V2 instance-manager pod is recreated, and Longhorn refuses to apply the change while V2 volumes are attached. Stop workloads that use Longhorn V2 volumes and detach those volumes before changing the setting.

:::

If the setting exists in your Longhorn version, you can check it with:

```shell
kubectl -n longhorn-system get settings.longhorn.io data-engine-cpu-isolation-enabled
```

Enable it for the V2 Data Engine:

```shell
kubectl -n longhorn-system patch settings.longhorn.io data-engine-cpu-isolation-enabled \
  --type=merge \
  -p '{"value":"{\"v2\":\"true\"}"}'
```

Then wait for the V2 instance-manager pods to be recreated after all V2 volumes are detached.

Verify the instance-manager log:

```shell
kubectl -n longhorn-system logs <v2-instance-manager-pod> | \
  grep -E "Setting IRQ affinity|Setting workqueue cpumask|Applied IRQ affinity|Applied global workqueue cpumask"
```

Example expected messages:

```text
Setting IRQ affinity to exclude SPDK CPUs
Applied IRQ affinity mask
Setting workqueue cpumask to exclude SPDK CPUs
Applied global workqueue cpumask
Applied per-workqueue cpumask
```

## Manual Workaround for Versions Without the Longhorn Setting

Use this workaround for Harvester versions earlier than v1.9.0, where the bundled Longhorn version does not include `data-engine-cpu-isolation-enabled`. For later versions, first check whether the Longhorn setting exists and prefer the setting-based risk-reduction path when possible.

The goal is to move IRQs and unbound workqueues away from the SPDK CPUs. For example, if SPDK uses the default CPUs `0` and `1`, IRQs and unbound workqueues should use CPU `2` through the last online CPU.

This workaround is a risk-reduction step, not a guaranteed fix for every workqueue lockup. CPU-bound or per-CPU kernel workers can still run on the SPDK CPUs because they are tied to those CPUs by the kernel. The expected result is that the node remains stable and any remaining workqueue stalls recover quickly instead of hanging for a long time.

Repeat this workaround whenever the Longhorn V2 CPU mask changes. If CPU allocation is managed dynamically, the IRQ and workqueue masks must be recalculated after each placement change.

### 1. Identify the Non-SPDK CPUs and Mask

The default Longhorn V2 CPU mask is `0x3`, so SPDK uses CPUs `0` and `1`.

On the example node, all online CPUs are `0-23`:

```shell
cat /sys/devices/system/cpu/online
```

```text
0-23
```

Use the following values for this default example:

| Item | Value |
| --- | --- |
| SPDK CPUs | `0,1` |
| Non-SPDK CPU list | `2-23` |
| Linux affinity mask | `fffffc` |

The Linux affinity mask is a CPU bitmap written in hexadecimal. CPU `0` is bit `0`, CPU `1` is bit `1`, and so on. On a 24-CPU node, all CPUs enabled is `ffffff`. Excluding CPUs `0` and `1` clears the lowest two bits, so the mask becomes `fffffc`. Leading zeros are optional, so `fffffc` and `00fffffc` are equivalent.

Do not copy these values blindly if your Longhorn V2 CPU mask or online CPU list is different. The non-SPDK CPU list must be all online CPUs except the CPUs used by the SPDK reactor threads.

### 2. Apply IRQ Affinity at Runtime

Set `NON_SPDK_AFFINITY_MASK` to the Linux affinity mask from the previous step.

```shell
NON_SPDK_AFFINITY_MASK=fffffc

echo "${NON_SPDK_AFFINITY_MASK}" > /proc/irq/default_smp_affinity

for f in /proc/irq/[0-9]*/smp_affinity; do
  echo "${NON_SPDK_AFFINITY_MASK}" > "${f}" 2>/dev/null || true
done
```

Some IRQs may reject affinity updates because they are managed by the kernel. This is expected. Always verify `effective_affinity_list` after applying the change.

Changing IRQ affinity alone may not make existing workqueue lockup messages disappear. Kernel workqueues can still run on the SPDK CPUs until the workqueue CPU masks are updated, and workers that are already stuck may continue to be reported by the kernel. Apply the workqueue affinity change as well, and then verify whether new lockup messages stop appearing.

These runtime IRQ affinity changes are not persistent across reboot. Use the persistence step later in this section if the runtime change mitigates the issue.

### 3. Apply Workqueue Affinity at Runtime

```shell
NON_SPDK_AFFINITY_MASK=fffffc

echo "${NON_SPDK_AFFINITY_MASK}" > /sys/devices/virtual/workqueue/cpumask

for f in /sys/devices/virtual/workqueue/*/cpumask; do
  echo "${NON_SPDK_AFFINITY_MASK}" > "${f}" 2>/dev/null || true
done
```

These runtime workqueue affinity changes are not persistent across reboot. Use the persistence step later in this section if the runtime change mitigates the issue.

### 4. Restart the V2 Instance-Manager Pod

After changing both IRQ and workqueue affinity, restart the Longhorn V2 instance-manager pod on the affected node. This is required because the existing `spdk_tgt` process can keep the SPDK reactor threads on the busy CPUs, and already-stuck CPU-bound workers may continue to be reported by the kernel until `spdk_tgt` is recreated.

:::caution

Detach all Longhorn V2 volumes attached to the affected node before restarting the V2 instance-manager pod. You do not need to detach V2 volumes attached to other nodes. Restarting an instance-manager while V2 volumes are still attached to the affected node can interrupt storage I/O and affect running VMs.

:::

Check the Longhorn V2 volumes first:

```shell
kubectl -n longhorn-system get volumes.longhorn.io \
  -o custom-columns=NAME:.metadata.name,DATAENGINE:.spec.dataEngine,STATE:.status.state,NODE:.status.currentNodeID
```

Only continue after all `v2` volumes whose `NODE` is the affected node are detached.

Find the V2 instance-manager pod on the affected node:

```shell
AFFECTED_NODE=hp-114-tink-system

kubectl -n longhorn-system get pods \
  -l longhorn.io/component=instance-manager,longhorn.io/data-engine=v2 \
  --field-selector spec.nodeName="${AFFECTED_NODE}" \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName
```

Restart the V2 instance-manager pod:

```shell
V2_IM_POD=<v2-instance-manager-pod-name>

kubectl -n longhorn-system delete pod "${V2_IM_POD}"
```

### 5. Make IRQ and Workqueue Affinity Persistent

The previous IRQ and workqueue affinity commands only change runtime procfs and sysfs state, so they are lost after reboot. If those runtime changes reduce or stop new lockup messages, use a Harvester `CloudInit` resource to reapply both IRQ and workqueue affinity after reboot. This follows the same model as the Longhorn CPU isolation setting, which updates host IRQ and workqueue affinity at runtime.

The following manifest is a Harvester `CloudInit` resource, not a file that you manually place on each node. Save it on a machine with `kubectl` access to the Harvester cluster and apply it with `kubectl apply -f <file-name>.yaml`. The Harvester controller writes the content to `/oem/99_longhorn_v2_cpu_affinity.yaml` on each node matched by `matchSelector`.

You can add this resource after the cluster is already installed. The file is synchronized to the matched nodes after the resource is applied, but the cloud-init commands take effect only after those nodes are rebooted. After reboot, the commands are applied again on each boot.

Example CloudInit resource for the default SPDK CPUs `0` and `1` on a 24-CPU node:

```yaml
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: longhorn-v2-cpu-affinity
spec:
  matchSelector:
    kubernetes.io/hostname: "hp-114-tink-system"
  filename: 99_longhorn_v2_cpu_affinity.yaml
  contents: |
    stages:
      network:
        - commands:
            - echo fffffc > /proc/irq/default_smp_affinity
            - for f in /proc/irq/[0-9]*/smp_affinity; do echo fffffc > "${f}" 2>/dev/null || true; done
            - echo fffffc > /sys/devices/virtual/workqueue/cpumask
            - for f in /sys/devices/virtual/workqueue/*/cpumask; do echo fffffc > "${f}" 2>/dev/null || true; done
```

Adjust the affinity mask and `matchSelector` for your environment. To target a different affected node, replace `hp-114-tink-system` with that node's `kubernetes.io/hostname` label value. Do not use `matchSelector: {}` unless every node should receive this workaround. This workaround is not dynamically reconciled. If the Longhorn V2 CPU mask changes, update the CloudInit resource and reboot the affected nodes.

After configuring the CloudInit resource, reboot the affected nodes for the commands to take effect. To apply the workaround immediately before reboot, run the runtime commands in the previous steps.

## If Lockups Still Appear

The IRQ and workqueue affinity changes reduce the chance of a workqueue lockup, but they may not eliminate it in every environment. The workqueue CPU mask mainly controls unbound workqueues. Bound or per-CPU workqueues can still run on their associated CPU, so kernel workers such as `kworker/20:*` may still appear on an SPDK CPU even after unbound workqueues are moved away.

If the node still reports occasional workqueue lockups after the IRQ and workqueue affinity mitigation is applied, use the following additional mitigations.

### 1. Change the Longhorn V2 Disk Driver to `auto`

If the affected Longhorn V2 disk is using the `aio` disk driver, consider changing the requested disk driver to `auto`. For an NVMe disk, verify after reprovisioning that Longhorn reports the actual disk driver as `nvme` in the Longhorn `Node` custom resource. In recent validation, after applying IRQ affinity and confirming that the actual disk driver was `nvme`, no new workqueue lockup messages were observed during the test window.

:::caution

Only use the SPDK NVMe disk driver when the NVMe device satisfies the Longhorn V2 IOMMU group isolation requirement. Longhorn uses `vfio-pci` for the SPDK NVMe path, and VFIO must claim the whole IOMMU group. If the NVMe device shares an IOMMU group with a PCIe bridge or another device that cannot be bound to VFIO, Longhorn cannot use the SPDK NVMe driver for that disk and the disk must stay on the `aio` driver. For details, see the Longhorn [V2 Data Engine requirements](https://longhorn.io/docs/1.12.0/deploy/install/#v2-data-engine-requirements).

:::

Before changing the disk driver, remove the affected disk from Harvester. Follow the [Remove Disks](https://docs.harvesterhci.io/v1.8/host/#remove-disks) guide, and make sure the disk no longer contains active Longhorn replicas or backing images.

Find the `BlockDevice` resource for the disk:

```shell
kubectl -n longhorn-system get blockdevices.harvesterhci.io \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,PROVISION:.spec.provision,PHASE:.status.provisionPhase,STATE:.status.state,ENGINE:.spec.provisioner.longhorn.engineVersion,DRIVER:.spec.provisioner.longhorn.diskDriver
```

After the disk is removed and the `BlockDevice` is no longer provisioned, patch the disk driver:

```shell
BLOCKDEVICE=<blockdevice-name>

kubectl -n longhorn-system patch blockdevice.harvesterhci.io "${BLOCKDEVICE}" \
  --type=merge \
  -p '{"spec":{"provisioner":{"longhorn":{"engineVersion":"LonghornV2","diskDriver":"auto"}}}}'
```

Provision the disk again from the Harvester UI. Harvester will add the disk back to Longhorn V2. Then verify the requested driver in the `BlockDevice` resource and the actual driver in the Longhorn `Node` resource.

Verify the `BlockDevice` after provisioning:

```shell
kubectl -n longhorn-system get blockdevice.harvesterhci.io "${BLOCKDEVICE}" -o yaml
```

The matching `BlockDevice` should show:

```yaml
spec:
  provision: true
  provisioner:
    longhorn:
      engineVersion: LonghornV2
      diskDriver: auto
status:
  provisionPhase: Provisioned
  state: Active
```

Also check the Longhorn `Node` custom resource to confirm the actual disk driver selected by Longhorn:

```shell
kubectl -n longhorn-system get nodes.longhorn.io \
  -o go-template='{{printf "NODE\tDISK\tTYPE\tPATH\tSPEC_DRIVER\tSTATUS_DRIVER\n"}}{{range .items}}{{ $node := . }}{{range $diskName, $disk := .spec.disks}}{{ $status := index $node.status.diskStatus $diskName }}{{printf "%s\t%s\t%s\t%s\t%s\t%s\n" $node.metadata.name $diskName $disk.diskType $disk.path $disk.diskDriver $status.diskDriver}}{{end}}{{end}}'
```

For the affected disk, `SPEC_DRIVER` should be `auto`, and `STATUS_DRIVER` should be `nvme`:

```text
NODE                  DISK                                  TYPE    PATH          SPEC_DRIVER   STATUS_DRIVER
hp-161-tink-system    32f43222-1eb1-4ab6-9e65-c4f8ddad700d  block   0000:08:00.0  auto          nvme
```

The `spec.disks.<blockdevice-name>.diskDriver` value is the requested driver mode from Harvester. The `status.diskStatus.<blockdevice-name>.diskDriver` value is the driver Longhorn actually uses. For an NVMe disk, the status value should be `nvme`.

### 2. Enable Longhorn V2 Interrupt Mode

If the lockup still occurs after changing the disk driver and applying IRQ affinity, consider enabling [Longhorn V2 interrupt mode](https://longhorn.io/docs/1.12.0/advanced-resources/v2-data-engine/interrupt-mode/).

:::caution

Longhorn V2 interrupt mode should still be treated as experimental. It changes the SPDK execution model from continuous polling to interrupt-driven handling, which can reduce constant CPU pressure but may affect latency and performance. Longhorn also requires all V2 volumes to be detached before this setting can be changed.

:::

Check the setting:

```shell
kubectl -n longhorn-system get settings.longhorn.io data-engine-interrupt-mode-enabled
```

Enable interrupt mode for the V2 Data Engine:

```shell
kubectl -n longhorn-system patch settings.longhorn.io data-engine-interrupt-mode-enabled \
  --type=merge \
  -p '{"value":"{\"v2\":\"true\"}"}'
```

Wait for the V2 instance-manager pods to be recreated after all V2 volumes are detached.

## Verification

After applying the mitigation, verify the items that directly confirm the node recovered and the settings are still applied.

1. Kernel logs no longer report new workqueue lockups, or any remaining reports are short and do not keep increasing for a long time.

   ```shell
   journalctl -k --since "30 minutes ago" | grep -E "BUG: workqueue lockup|soft lockup" || true
   ```

   If occasional messages still appear, compare the `stuck for <seconds>s` value over time. The mitigation is still useful if the stuck time stops growing, the node remains responsive, and RKE2, kubelet, and Longhorn keep making progress.

1. The Longhorn V2 instance-manager pod is running on the affected node.

   ```shell
   AFFECTED_NODE=hp-114-tink-system

   kubectl -n longhorn-system get pods \
     -l longhorn.io/component=instance-manager,longhorn.io/data-engine=v2 \
     --field-selector spec.nodeName="${AFFECTED_NODE}"
   ```

1. If you configured the persistent workaround and rebooted the node, the IRQ and workqueue masks are still applied.

   ```shell
   cat /proc/irq/default_smp_affinity
   cat /sys/devices/virtual/workqueue/cpumask
   ```

## References

- Harvester bug: [harvester/harvester#11030](https://github.com/harvester/harvester/issues/11030)
- Longhorn bug: [longhorn/longhorn#13417](https://github.com/longhorn/longhorn/issues/13417)
- Longhorn setting reference: [Data Engine CPU Mask](https://longhorn.io/docs/1.12.0/references/settings/#data-engine-cpu-mask)
- Longhorn setting reference: [Data Engine Interrupt Mode Enabled](https://longhorn.io/docs/1.12.0/references/settings/#data-engine-interrupt-mode-enabled)
- Longhorn documentation: [Interrupt Mode Support](https://longhorn.io/docs/1.12.0/advanced-resources/v2-data-engine/interrupt-mode/)
- Linux kernel documentation: [IRQs](https://docs.kernel.org/core-api/irq/index.html)
- Linux kernel documentation: [Workqueue](https://docs.kernel.org/core-api/workqueue.html)
