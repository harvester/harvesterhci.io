---
title: How Harvester Eliminate VM OOM
description: How VM OOM happens and how Harvester eliminate it effectively.
slug: how_harvester_eliminate_vm_oom
authors:
  - name: Jian Wang
    title: Staff Software Engineer
    url: https://github.com/w13915984028
    image_url: https://github.com/w13915984028.png
tags: [harvester, virtual machine, OOM]
hide_table_of_contents: false
---

## The phenomenon of VM OOM

Sometimes, the running VM got `OOM killed` by the Harvester host Linux OS. The kernel log shows information like following examples.


Example 1: Keyword: virt-launcher invoked oom-killer.

The virt-launcher is a KubeVirt related process running in the VM backed pod's related cgroup. Means when this process runs into memory operation, it triggers cgroup OOM killer.

```sh
Feb 03 19:57:08 ** kernel: virt-launcher invoked oom-killer: gfp_mask=0xcc0(GFP_KERNEL), order=0, oom_score_adj=986
Feb 03 19:57:08 ** kernel: CPU: 40 PID: 40785 Comm: virt-launcher Tainted: G          I    X    5.14.21-150400.24.60-default #1 SLE15-SP4 9096397fa6646928cc6d185ba417f2af65b536f1
...

Feb 03 19:57:08 ** kernel: memory: usage 17024340kB, limit 17024340kB, failcnt 1243
Feb 03 19:57:08 ** kernel: memory+swap: usage 17024340kB, limit 9007199254740988kB, failcnt 0                                                                       
Feb 03 19:57:08 ** kernel: kmem: usage 143556kB, limit 9007199254740988kB, failcnt 0
Feb 03 19:57:08 ** kernel: Memory cgroup stats for /kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod968a06fb_9ab9_4819_8caf_0392ddff3d9b.slice:
...
Feb 03 19:57:08 ** kernel: Tasks state (memory values in pages):
Feb 03 19:57:08 ** kernel: [  pid  ]   uid  tgid total_vm      rss pgtables_bytes swapents oom_score_adj name
Feb 03 19:57:08 ** kernel: [  38886]     0 38886      243        1    28672        0          -998 pause
Feb 03 19:57:08 ** kernel: [  38917]     0 38917   310400     6921   192512        0           986 virt-launcher-m
Feb 03 19:57:08 ** kernel: [  38934]     0 38934  1200940    25126   954368        0           986 virt-launcher
Feb 03 19:57:08 ** kernel: [  38951]     0 38951   386525     8247   466944        0           986 libvirtd
Feb 03 19:57:08 ** kernel: [  38952]     0 38952    33619     3940   290816        0           986 virtlogd
Feb 03 19:57:08 ** kernel: [  39079]   107 39079  4457263  4201766 34439168        0           986 qemu-system-x86
Feb 03 19:57:08 ** kernel: oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=cri-containerd-0f32894de86edf3d3832702af794874ef8d400b4969acdea4976b12040756e0d.scope,mems_allowed=0-1,oom_memcg=/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod968a06fb_9ab9_4819_8caf_0392ddff3d9b.slice,task_memcg=/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod968a06fb_9ab9_4819_8caf_0392ddff3d9b.slice/cri-containerd-0f32894de86edf3d3832702af794874ef8d400b4969acdea4976b12040756e0d.scope,task=qemu-system-x86,pid=39079,uid=107
```


Example 2: Keyword: CPU 11/KVM invoked oom-kille

The CPU 11/KVM is a thread of qemu-system-x86 process, which simulates the vCPU to guest OS. Means when this process runs into memory operation, it triggers cgroup OOM killer.

```sh
[Thu May  9 14:52:38 2024] CPU 11/KVM invoked oom-killer: gfp_mask=0xcc0(GFP_KERNEL), order=0, oom_score_adj=830
[Thu May  9 14:52:38 2024] CPU: 60 PID: 70888 Comm: CPU 11/KVM Not tainted 5.3.18-150300.59.101-default #1 SLE15-SP3
...
[Thu May  9 14:52:38 2024] memory: usage 67579904kB, limit 67579904kB, failcnt 67391
[Thu May  9 14:52:38 2024] memory+swap: usage 0kB, limit 9007199254740988kB, failcnt 0
[Thu May  9 14:52:38 2024] kmem: usage 633636kB, limit 9007199254740988kB, failcnt 0
...
[Thu May  9 14:52:38 2024] Tasks state (memory values in pages):
[Thu May  9 14:52:38 2024] [  pid  ]   uid  tgid total_vm      rss pgtables_bytes swapents oom_score_adj name
[Thu May  9 14:52:38 2024] [  70675]     0 70675      243        1    28672        0          -998 pause
[Thu May  9 14:52:38 2024] [  70728]     0 70728   310400     5467   188416        0           830 virt-launcher-m
[Thu May  9 14:52:38 2024] [  70746]     0 70746  1242373    25104  1073152        0           830 virt-launcher
[Thu May  9 14:52:38 2024] [  70762]     0 70762   455279    14110   770048        0           830 libvirtd
[Thu May  9 14:52:38 2024] [  70763]     0 70763    37704     3916   339968        0           830 virtlogd
[Thu May  9 14:52:38 2024] [  70870]   107 70870 18302464 16718510 135278592        0           830 qemu-system-x86
[Thu May  9 14:52:38 2024] oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=cri-containerd-100093783c22a3ae1a42e21dd887b7c26eef52d56ba44c7273ef54507b6efe7c.scope,mems_allowed=0-3,oom_memcg=/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podef91e487_dec5_4613_800b_eb23e1a1617d.slice,task_memcg=/kubepods.slice/kubepods-urstable.slice/kubepods-burstable-podef91e487_dec5_4613_800b_eb23e1a1617d.slice/cri-containerd-100093783c22a3ae1a42e21dd887b7c26eef52d56ba44c7273ef54507b6efe7c.scope,task=qemu-system-x86,pid=70870,uid=107
[Thu May  9 14:52:38 2024] Memory cgroup out of memory: Killed process 70870 (qemu-system-x86) total-vm:73209856kB, anon-rss:66852088kB, file-rss:21948kB, shmem-rss:4kB
[Thu May  9 14:52:38 2024] oom_reaper: reaped process 70870 (qemu-system-x86), now anon-rss:0kB, file-rss:132kB, shmem-rss:4kB
```


## The root cause of VM OOM

### How VM runs on a k8s cluster

Differences of a VM running on native Linux Host and Harvester.
Run a VM via Virtual Machine Manager
E.g. A Host OS with Ubuntu 20.04 runs a VM created via Virtual Machine Manager, this VM is further used as Harvester node.

```sh
$ systemd-cgls
Control group /:
-.slice
├─1173 bpfilter_umh
├─system.slice

└─machine.slice
  └─machine-qemu\x2d1\x2dharv41.scope 
    └─8632 /usr/bin/qemu-system-x86_64 -name guest=harv41,debug-threads=on -S -…
All CPU and memory resources are used by this qemu-system-x86_64 process.
```

### Run VM on Harvester

When a VM runs on Harvester, this VM is controlled by a cgroup slice, which comes from includes k8s pod.

```sh
-.slice
└─kubepods.slice
  │ ├─kubepods-burstable-pod99ee3a64_645b_4699_9384_5a3875d78b41.slice
  │ │ ├─cri-containerd-0c316eb8a4711bff1ce968b46ddb658e49378897454b4caf2a20704c808f33f1.scope …
  │ │ │ └─ 8505 /pause
  │ │ ├─cri-containerd-eb5deef29f064adfd2456d9f9c535674ac4d0c95c81b13afbdab5a89dc6a774b.scope …
  │ │ │ └─ 8590 /usr/bin/virt-tail --logfile /var/run/kubevirt-private/2ce151aa…
  │ │ └─cri-containerd-fd57a5cfc2b9b1f53eaf7b575c3273e6784f4c56a04a17d502ecfbd19e55b066.scope …
  │ │   ├─ 8542 /usr/bin/virt-launcher-monitor --qemu-timeout 301s --name vm2 -…
  │ │   ├─ 8558 /usr/bin/virt-launcher --qemu-timeout 301s --name vm2 --uid 2ce…
  │ │   ├─ 8591 /usr/sbin/virtqemud -f /var/run/libvirt/virtqemud.conf
  │ │   ├─ 8592 /usr/sbin/virtlogd -f /etc/libvirt/virtlogd.conf
  │ │   └─ 8823 /usr/bin/qemu-system-x86_64 -name guest=default_vm2,debug-threa…
All the above processes are included in the cgroup slices.

VM definition, user configured 2GiB, but Harvester reserved 100M, the memory.guest is 1948Mi.

apiVersion: kubevirt.io/v1
kind: VirtualMachine

        machine:
          type: q35
        memory:
          guest: 1948Mi
        resources:
          limits:
            cpu: "2"
            memory: 2Gi
          requests:
            cpu: 125m
            memory: 1365Mi
Limits on cgroup slices:

$cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod99ee3a64_645b_4699_9384_5a3875d78b41.slice/memory.limit_in_bytes
2,472,419,328


$ cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod99ee3a64_645b_4699_9384_5a3875d78b41.slice/memory.max_usage_in_bytes
341,999,616


$ cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod99ee3a64_645b_4699_9384_5a3875d78b41.slice/memory.usage_in_bytes
341,094,400


$ cat /sys/fs/cgroup/memory/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod99ee3a64_645b_4699_9384_5a3875d78b41.slice/memory.stat
cache 0
rss 0
rss_huge 0
shmem 0
mapped_file 0
dirty 0
writeback 0
swap 0
pgpgin 0
pgpgout 0
pgfault 0
pgmajfault 0
inactive_anon 0
active_anon 0
inactive_file 0
active_file 0
unevictable 0
hierarchical_memory_limit 2,472,419,328
hierarchical_memsw_limit 9223372036854771712
total_cache      2,019,328
total_rss      320,323,584
total_rss_huge 222,298,112
total_shmem 0
total_mapped_file 155,648
total_dirty 0
total_writeback 0
total_swap 0
total_pgpgin 38258
total_pgpgout 14511
total_pgfault 44898
total_pgmajfault 1
total_inactive_anon 268,607,488
total_active_anon    52,690,944
total_inactive_file   1,978,368
total_active_file 40960
total_unevictable 0
Memory overhead:

cgroup memory.limit_in_bytes: 2,412,421,120

overhead: >>> 2412421120-2*1024*1024*1024
264937472

264,937,472 (~ 252 M)
```


## The solution from Harvester

### Global setting: additional-guest-memory-overhead-ratio

### Per VM configuration: Reserved Memory

## Best Practice

