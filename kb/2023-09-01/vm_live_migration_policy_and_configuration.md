---
title: VM Live Migration Policy and Configuration
description: Know how VM live migration works, the migration policies, how to tune the policies and check status
slug: vm_live_migration_policy_and_configuration
authors:
  - name: Jian Wang
    title: Staff Software Engineer
    url: https://github.com/w13915984028
    image_url: https://github.com/w13915984028.png
tags: [harvester, virtual machine, VM, live migration, policy, strategy, configuration]
hide_table_of_contents: false
---

# VM Live Migration

In Harvester, the **VM Live Migration** is well supported by the UI. Please refer to [Harvester VM Live Migration](https://docs.harvesterhci.io/v1.1/vm/live-migration) for more details.

The VM Live Migration process is finished smoothly in most cases. However, sometimes the migration may get stuck and not end as expected.

This article dives into the VM Live Migration process in more detail. There are three main parts:

- General Process of VM Live Migration
- VM Live Migration Strategies
- VM Live Migration Configurations

Related issues:

- [Migration should show the proper status and progress in the UI](https://github.com/harvester/harvester/issues/4352)
- [VM Migration policy and status](https://github.com/harvester/harvester/issues/4376)

:::note

A big part of the following contents are copied from `kubevirt` document https://kubevirt.io/user-guide/operations/live_migration/, some contents/formats are adjusted to fit in this document.

:::

## General Process of VM Live Migration

### Starting a Migration from Harvester UI

1. Go to the **Virtual Machines** page.
1. Find the virtual machine that you want to migrate and select **⋮** > **Migrate**.
1. Choose the node to which you want to migrate the virtual machine and select **Apply**.

After successfully selecting **Apply**, a CRD `VirtualMachineInstanceMigration` object is created, and the related `controller/operator` will start the process.

### Migration CRD Object

You can also create the CRD `VirtualMachineInstanceMigration` object manually via `kubectl` or other tools.

The example below starts a migration process for a virtual machine instance (VMI) `new-vm`.

```
apiVersion: kubevirt.io/v1
kind: VirtualMachineInstanceMigration
metadata:
  name: migration-job
spec:
  vmiName: new-vm
```

Under the hood, the open source projects `Kubevirt, Libvirt, QEMU, ... ` perform most of the `VM Live Migration`. [References.](#references)

### Migration Status Reporting

When starting a virtual machine instance (VMI), it has also been calculated whether the machine is live migratable. The result is being stored in the VMI `VMI.status.conditions`. The calculation can be based on multiple parameters of the VMI, however, at the moment, the calculation is largely based on the Access Mode of the VMI volumes. Live migration is only permitted when the volume access mode is set to ReadWriteMany. Requests to migrate a non-LiveMigratable VMI will be rejected.

The reported Migration Method is also being calculated during VMI start. `BlockMigration` indicates that some of the VMI disks require copying from the source to the destination. `LiveMigration` means that only the instance memory will be copied.

```
Status:
  Conditions:
    Status: True
    Type: LiveMigratable
  Migration Method: BlockMigration
```

### Migration Status

The migration progress status is reported in `VMI.status`. Most importantly, it indicates whether the migration has been completed or failed.

Below is an example of a successful migration.

```
Migration State:
    Completed:        true
    End Timestamp:    2019-03-29T03:37:52Z
    Migration Config:
      Completion Timeout Per GiB:  800
      Progress Timeout:             150
    Migration UID:                  c64d4898-51d3-11e9-b370-525500d15501
    Source Node:                    node02
    Start Timestamp:                2019-03-29T04:02:47Z
    Target Direct Migration Node Ports:
      35001:                      0
      41068:                      49152
      38284:                      49153
    Target Node:                  node01
    Target Node Address:          10.128.0.46
    Target Node Domain Detected:  true
    Target Pod:                   virt-launcher-testvmimcbjgw6zrzcmp8wpddvztvzm7x2k6cjbdgktwv8tkq
```

## VM Live Migration Strategies

VM Live Migration is a process during which a running Virtual Machine Instance moves to another compute node while the guest workload continues to run and remain accessible.

### Understanding Different VM Live Migration Strategies

VM Live Migration is a complex process. During a migration, the source VM needs to transfer its whole state (mainly RAM) to the target VM. If there are enough resources available, such as network bandwidth and CPU power, migrations should converge nicely. If this is not the scenario, however, the migration might get stuck without an ability to progress.

The main factor that affects migrations from the guest perspective is its dirty rate, which is the rate by which the VM dirties memory. Guests with high dirty rate lead to a race during migration. On the one hand, memory would be transferred continuously to the target, and on the other, the same memory would get dirty by the guest. On such scenarios, one could consider to use more advanced migration strategies. Refer to [Understanding different migration strategies](https://kubevirt.io/user-guide/operations/live_migration/#understanding-different-migration-strategies) for more details.

There are 3 `VM Live Migration` strategies/policies:

#### VM Live Migration Strategy: Pre-copy

Pre-copy is the default strategy. It should be used for most cases.

The way it works is as following:
1. The target VM is created, but the guest keeps running on the source VM.
1. The source starts sending chunks of VM state (mostly memory) to the target. This continues until all of the state has been transferred to the target.
1. The guest starts executing on the target VM. 4. The source VM is being removed.

Pre-copy is the safest and fastest strategy for most cases. Furthermore, it can be easily cancelled, can utilize multithreading, and more. If there is no real reason to use another strategy, this is definitely the strategy to go with.

However, on some cases migrations might not converge easily, that is, by the time the chunk of source VM state would be received by the target VM, it would already be mutated by the source VM (which is the VM the guest executes on). There are many reasons for migrations to fail converging, such as a high dirty-rate or low resources like network bandwidth and CPU. On such scenarios, see the following alternative strategies below.

#### VM Live Migration Strategy: Post-copy

The way post-copy migrations work is as following:
1. The target VM is created.
1. The guest is being run on the target VM.
1. The source starts sending chunks of VM state (mostly memory) to the target.
1. When the guest, running on the target VM, would access memory: 1. If the memory exists on the target VM, the guest can access it. 2. Otherwise, the target VM asks for a chunk of memory from the source VM.
1. Once all of the memory state is updated at the target VM, the source VM is being removed.

The main idea here is that the guest starts to run immediately on the target VM. This approach has advantages and disadvantages:

**Advantages:**

- The same memory chink is never being transferred twice. This is possible due to the fact that with post-copy it doesn't matter that a page had been dirtied since the guest is already running on the target VM.
- This means that a high dirty-rate has much less effect.
- Consumes less network bandwidth.

**Disadvantages:**

- When using post-copy, the VM state has no one source of truth. When the guest (running on the target VM) writes to memory, this memory is one part of the guest's state, but some other parts of it may still be updated only at the source VM. This situation is generally dangerous, since, for example, if either the target or guest VMs crash the state cannot be recovered.
- Slow warmup: when the guest starts executing, no memory is present at the target VM. Therefore, the guest would have to wait for a lot of memory in a short period of time.
- Slower than pre-copy on most cases.
- Harder to cancel a migration.

#### VM Live Migration Strategy: Auto-converge

Auto-converge is a technique to help pre-copy migrations converge faster without changing the core algorithm of how the migration works.

Since a high dirty-rate is usually the most significant factor for migrations to not converge, auto-converge simply throttles the guest's CPU. If the migration would converge fast enough, the guest's CPU would not be throttled or throttled negligibly. But, if the migration would not converge fast enough, the CPU would be throttled more and more as time goes.

This technique dramatically increases the probability of the migration converging eventually.

### Observe the VM Live Migration Progress and Result

#### Migration Timeouts

Depending on the type, the live migration process will copy virtual machine memory pages and disk blocks to the destination. During this process non-locked pages and blocks are being copied and become free for the instance to use again. To achieve a successful migration, it is assumed that the instance will write to the free pages and blocks (pollute the pages) at a lower rate than these are being copied.

#### Completion Time

In some cases the virtual machine can write to different memory pages / disk blocks at a higher rate than these can be copied, which will prevent the migration process from completing in a reasonable amount of time. In this case, live migration will be aborted if it is running for a long period of time. The timeout is calculated base on the size of the VMI, it's memory and the ephemeral disks that are needed to be copied. The configurable parameter completionTimeoutPerGiB, which defaults to 800s is the time for GiB of data to wait for the migration to be completed before aborting it. A VMI with 8Gib of memory will time out after 6400 seconds.

#### Progress Timeout

A VM Live Migration will also be aborted when it notices that copying memory doesn't make any progress. The time to wait for live migration to make progress in transferring data is configurable by the `progressTimeout` parameter, which defaults to 150 seconds.

## VM Live Migration Configurations

### Changing Cluster Wide Migration Limits

KubeVirt puts some limits in place so that migrations don't overwhelm the cluster. By default, it is to only run 5 migrations in parallel with an additional limit of a maximum of 2 outbound migrations per node. Finally, every migration is limited to a bandwidth of 64MiB/s.

You can change these values in the `kubevirt` CR:
```
    apiVersion: kubevirt.io/v1
    kind: Kubevirt
    metadata:
      name: kubevirt
      namespace: kubevirt
    spec:
      configuration:
        migrations:
          parallelMigrationsPerCluster: 5
          parallelOutboundMigrationsPerNode: 2
          bandwidthPerMigration: 64Mi
          completionTimeoutPerGiB: 800
          progressTimeout: 150
          disableTLS: false
          nodeDrainTaintKey: "kubevirt.io/drain"
          allowAutoConverge: false ---------------------> related to: Auto-converge
          allowPostCopy: false -------------------------> related to: Post-copy
          unsafeMigrationOverride: false
```

Remember that most of these configurations can be overridden and fine-tuned to a specified group of VMs. For more information, please refer to the Migration Policies section below.

### Migration Policies

[Migration policies](https://kubevirt.io/user-guide/operations/migration_policies/) provides a new way of applying migration configurations to Virtual Machines. The policies can refine Kubevirt CR's `MigrationConfiguration` that sets the cluster-wide migration configurations. This way, the cluster-wide settings default how the migration policy can be refined (i.e., changed, removed, or added).

Remember that migration policies are in version `v1alpha1`. This means that this API is not fully stable yet and that APIs may change in the future.

#### Migration Configurations

Currently, the `MigrationPolicy` spec only includes the following configurations from Kubevirt CR's `MigrationConfiguration`. (In the future, more configurations that aren't part of Kubevirt CR will be added):

```
apiVersion: migrations.kubevirt.io/v1alpha1
kind: MigrationPolicy
  spec:
    allowAutoConverge: true
    bandwidthPerMigration: 217Ki
    completionTimeoutPerGiB: 23
    allowPostCopy: false
```

All the above fields are optional. When omitted, the configuration will be applied as defined in KubevirtCR's `MigrationConfiguration`. This way, KubevirtCR will serve as a configurable set of defaults for both VMs that are not bound to any `MigrationPolicy` and VMs that are bound to a `MigrationPolicy` that does not define all fields of the configurations.

##### Matching Policies to VMs

Next in the spec are the selectors defining the group of VMs to apply the policy. The options to do so are the following.

This policy applies to the VMs in namespaces that have all the required labels:

```
apiVersion: migrations.kubevirt.io/v1alpha1
kind: MigrationPolicy
  spec:
  selectors:
    namespaceSelector:
      hpc-workloads: true       # Matches a key and a value
```

The policy below applies to the VMs that have all the required labels:

```
apiVersion: migrations.kubevirt.io/v1alpha1
kind: MigrationPolicy
  spec:
  selectors:
    virtualMachineInstanceSelector:
      workload-type: db       # Matches a key and a value
```

## References

### Documents

### Libvirt Guest Migration

`Libvirt` has a chapter to describe the pricipal of `VM/Guest Live Migration`.

https://libvirt.org/migration.html

### Kubevirt Live Migration

https://kubevirt.io/user-guide/operations/live_migration/

### Source Code

The `VM Live Migration` related configuration options are passed to each layer correspondingly.

#### Kubevirt

https://github.com/kubevirt/kubevirt/blob/d425593ae392111dab80403ef0cde82625e37653/pkg/virt-launcher/virtwrap/live-migration-source.go#L103

```
...
import "libvirt.org/go/libvirt"

...

func generateMigrationFlags(isBlockMigration, migratePaused bool, options *cmdclient.MigrationOptions) libvirt.DomainMigrateFlags {
...
	if options.AllowAutoConverge {
		migrateFlags |= libvirt.MIGRATE_AUTO_CONVERGE
	}
	if options.AllowPostCopy {
		migrateFlags |= libvirt.MIGRATE_POSTCOPY
	}
...
}
```

#### Go Package Libvirt

https://pkg.go.dev/libvirt.org/go/libvirt

```
const (
...
	MIGRATE_AUTO_CONVERGE                 = DomainMigrateFlags(C.VIR_MIGRATE_AUTO_CONVERGE)
	MIGRATE_RDMA_PIN_ALL                  = DomainMigrateFlags(C.VIR_MIGRATE_RDMA_PIN_ALL)
	MIGRATE_POSTCOPY                      = DomainMigrateFlags(C.VIR_MIGRATE_POSTCOPY)
...
)
```

#### Libvirt

https://github.com/libvirt/libvirt/blob/bfe53e9145cd5996a791c5caff0686572b850f82/include/libvirt/libvirt-domain.h#L1030

```
    /* Enable algorithms that ensure a live migration will eventually converge.
     * This usually means the domain will be slowed down to make sure it does
     * not change its memory faster than a hypervisor can transfer the changed
     * memory to the destination host. VIR_MIGRATE_PARAM_AUTO_CONVERGE_*
     * parameters can be used to tune the algorithm.
     *
     * Since: 1.2.3
     */
    VIR_MIGRATE_AUTO_CONVERGE = (1 << 13),
...
   /* Setting the VIR_MIGRATE_POSTCOPY flag tells libvirt to enable post-copy
     * migration. However, the migration will start normally and
     * virDomainMigrateStartPostCopy needs to be called to switch it into the
     * post-copy mode. See virDomainMigrateStartPostCopy for more details.
     *
     * Since: 1.3.3
     */
    VIR_MIGRATE_POSTCOPY = (1 << 15),
```

