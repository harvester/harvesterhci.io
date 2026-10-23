---
title: Using NetApp Storage on Harvester
description: Installation and configuration of the NetApp Trident CSI driver (NFS, iSCSI, NVMe/TCP and FC) on Harvester
slug: install_netapp_trident_csi
authors:
  - name: Alejandro Bonilla
    url: https://github.com/abonillabeeche
    image_url: https://github.com/abonillabeeche.png
tags: [harvester, storage, netapp, trident, csi, iscsi, nfs, nvme, fc]
hide_table_of_contents: false
---

This article explains how to install the [NetApp Trident](https://docs.netapp.com/us-en/trident/) CSI driver on a Harvester cluster. Once it's installed, VMs running in Harvester can store their volumes on a NetApp ONTAP storage system.

NetApp storage is added alongside Longhorn; it does not replace it. You can use any combination of these protocols:

- **NFS** (`ontap-nas`)
- **iSCSI** (`ontap-san`, `sanType: iscsi`)
- **NVMe/TCP** (`ontap-san`, `sanType: nvme`)
- **Fibre Channel** (`ontap-san`, `sanType: fcp`)

This procedure was tested with **Harvester v1.9.0** and **Trident 26.06.1** (Helm chart `100.2606.1`), using ONTAP 9.16.1. With NFS, iSCSI and NVMe/TCP, the following worked on NetApp-backed volumes: booting VMs, live migration, online volume expansion, and Harvester VM snapshots. Trident also supports Fibre Channel, and the multipath configuration below covers FC LUNs. However, FC was **not tested** for this article.

:::note
This article replaces an earlier version (August 2023) written for Harvester v1.2.0 and Trident v23.07. The main changes:

- Multipath is now configured with a Harvester `CloudInit` resource, instead of files edited by hand on every node.
- Backends are now `TridentBackendConfig` resources, so `tridentctl` is no longer needed.
- NFS and NVMe/TCP are now covered.
- The extra `ClusterRole` for PSA ([NetApp/trident#839](https://github.com/NetApp/trident/issues/839)) was not needed in testing.
- Third-party volumes can now be used as VM boot volumes.
:::

## Prerequisites

- A Harvester cluster and its KubeConfig. To download it, open the Harvester UI, click **Support** in the lower left, then click **Download KubeConfig**.
- A workstation with `kubectl` and `helm` that can reach the Harvester cluster.
- An ONTAP SVM with:
  - A management LIF that the Harvester nodes can reach.
  - Data LIFs for each protocol you plan to use: NFS, iSCSI, NVMe/TCP and/or FC. NVMe/TCP requires the `NVMe_oF` license on the ONTAP system.
  - An ONTAP login for Trident with the `http` and `ontapi` applications enabled, using the SVM-scoped `vsadmin` role. Point `managementLIF` at the SVM's own management LIF; Trident then infers the SVM from that connection, so the backends below don't need an explicit `svm` field either. See [User permissions](https://docs.netapp.com/us-en/trident/trident-use/ontap-san.html) in the Trident documentation.
- For FC only: FC HBAs in every Harvester node that mounts NetApp volumes, and fabric zoning between those HBAs and the SVM's FC LIFs.

## Network design

Trident's node plugin runs in the host network namespace, so the host's routing table decides which NIC carries storage traffic.

:::tip
Avoid sending storage traffic over the management network. It's shared with the cluster control plane and the pod network, and adds overhead. For production, use a dedicated [cluster network](https://docs.harvesterhci.io/v1.9/networking/index) on its own NICs, as described in the next section.
:::

How Trident discovers data LIFs differs by protocol:

- **iSCSI / NVMe/TCP**: Trident ignores `dataLIF` on SAN backends and logs `Specifying data LIF is no longer supported for SAN backends`. It asks ONTAP for every SAN LIF in the SVM, and each node logs in to all of them, so multipath works automatically. You only need `managementLIF`.
- **NFS**: `dataLIF` takes a single address. If you leave it out, Trident uses the first NFS LIF it finds in the SVM. Set it explicitly to choose the network that carries NFS traffic.
- **FC**: traffic runs over the FC fabric, not the IP network, so the rest of this section does not apply. Only the management LIF must be reachable over IP.

### Optional: a dedicated storage interface with HostNetworkConfig

This takes two steps: create a cluster network on the storage NICs, then give each host an IP address on it with a HostNetworkConfig.

**Step 1: create the cluster network.** A cluster network groups the storage NICs into a bridge on each node. See [Create a New Cluster Network](https://docs.harvesterhci.io/v1.9/networking/index#create-a-new-cluster-network) for details.

1. In the Harvester UI, go to **Networks > ClusterNetworks/Configs** and click **Create**. Name it, for example `cn-storage`.
1. Click **Create Network Config** on the new cluster network.
1. On the **Node Selector** tab, select the nodes that mount NetApp volumes. **Select all nodes** does not work if the cluster has a witness node. Select nodes by name, or by a label such as `netapp-trident=enabled` (see the note further down).
1. On the **Uplink** tab, select the storage NICs, the bond mode, and the MTU. The MTU must match the switch ports and the ONTAP LIFs, for example `9000` for jumbo frames.
1. Click **Save**.

The switch ports for these NICs must be trunk ports that carry the storage VLAN tagged.

**Step 2: give the hosts an IP address on it.** On its own, a cluster network carries only VM traffic, because the hosts have no IP address on it. A [HostNetworkConfig](https://docs.harvesterhci.io/v1.9/networking/hostnetworkconfig/) (**Networks > Host Networks**) creates a VLAN sub-interface on the cluster network's bridge on each node and gives it an IP address. Traffic to the ONTAP data LIFs on that subnet then leaves through that interface instead of the management network. The ONTAP data LIFs must be on the same VLAN and subnet.

Example with static addresses on VLAN 150:

```yaml
apiVersion: network.harvesterhci.io/v1beta1
kind: HostNetworkConfig
metadata:
  name: netapp-storage
spec:
  clusterNetwork: cn-storage
  vlanID: 150
  mode: static
  nodeSelector:
    matchLabels:
      netapp-trident: enabled
  ips:
    <node-1>: 192.168.150.11/24
    <node-2>: 192.168.150.12/24
```

Check the result on a node with `ip addr show cn-storage-br.150`. Each node's state is reported in the resource's `status.nodeStatus`.

:::note Static mode and witness nodes
In `static` mode **without** a `nodeSelector`, the webhook requires an IP for **every** node in the cluster, witness included. Otherwise it rejects the resource with `static IP not found for node <witness>`. You have two options:

- **Add a `nodeSelector`**, as in the example above. Only the matching nodes then need an entry in `ips`. The selector can use the same `netapp-trident=enabled` label that [restricts the Trident node plugin](#2-install-the-trident-operator). This way the witness is excluded from the storage network and from Trident consistently.
- **Give the witness an IP as well.** It costs one address on the storage subnet. The witness never mounts volumes, so the address goes unused.

In static mode, new nodes are not configured automatically. Add their entry to `ips` (and the label, if you use one) when they join.
:::

For iSCSI, you can add a second cluster network (or a second VLAN) with its own HostNetworkConfig and LIFs, so multipath has two independent paths.

## 1. Configure multipathd (iSCSI and FC)

iSCSI and FC LUNs need `multipathd`, which is not enabled on Harvester by default. Both protocols present NetApp LUNs with vendor `NETAPP` and product `LUN`, so the same configuration covers them. The configuration below lets `multipathd` claim **only NetApp LUNs**. Every other device is blacklisted, so Longhorn and the local disks are never touched. Harvester's own `/etc/multipath/conf.d/99-longhorn.conf` is left as is.

:::caution
Never start `multipathd` before the NetApp-only configuration is in place. With its default configuration, `multipathd` claims local disks, including Longhorn disks, as `dm` multipath devices.
:::

The following `CloudInit` resource writes `/etc/multipath/conf.d/98-netapp.conf` and enables `multipathd` on every node. It is re-applied on every boot. Save it as `01-cloudinit-netapp-multipathd.yaml`:

```yaml
# Persists across reboots: writes /etc/multipath/conf.d/98-netapp.conf (multipath ONLY claims NETAPP LUNs)
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: netapp-multipathd
spec:
  matchSelector: {}
  filename: 98_netapp_multipathd.yaml
  contents: |
    name: "enable multipathd for NetApp Trident iSCSI/FC (NETAPP LUNs only)"
    stages:
      initramfs:
        - files:
            - path: /etc/multipath/conf.d/98-netapp.conf
              permissions: 0644
              owner: 0
              group: 0
              content: |
                defaults {
                    user_friendly_names yes
                    find_multipaths no
                    # lets libmpathpersist (qemu-pr-helper) track SCSI-3 PR keys across paths, for shared disks (e.g. WSFC)
                    reservation_key file
                    # don't create kpartx maps for partitions that guests create on the LUNs
                    skip_kpartx yes
                }
                blacklist {
                    device {
                        vendor ".*"
                        product ".*"
                    }
                }
                blacklist_exceptions {
                    device {
                        vendor "NETAPP"
                        product "LUN.*"
                    }
                }
      network:
        - name: "enable and start multipathd"
          systemctl:
            enable:
              - multipathd
            start:
              - multipathd
```

```shell
kubectl apply -f 01-cloudinit-netapp-multipathd.yaml
```

Despite the `initramfs` stage name, Harvester's node CloudInit controller writes the file and runs the `network` stage as soon as the resource is created — no reboot needed. Confirm the file actually merged into the running daemon's config (don't rely on `multipath -ll` alone, since it's empty if no LUN happens to be attached yet):

```shell
multipathd -k"show config" | grep -A6 '^blacklist {'   # must show vendor ".*" / product ".*"
```

If you'd rather apply it by hand instead of waiting on the controller, run the following on **each node** as root. It writes the same file and starts `multipathd`, and stops at the first failure:

```shell
set -e
mkdir -p /etc/multipath/conf.d
cat > /etc/multipath/conf.d/98-netapp.conf <<'EOF'
defaults {
    user_friendly_names yes
    find_multipaths no
    reservation_key file
    skip_kpartx yes
}
blacklist {
    device {
        vendor ".*"
        product ".*"
    }
}
blacklist_exceptions {
    device {
        vendor "NETAPP"
        product "LUN.*"
    }
}
EOF
systemctl enable --now multipathd
multipath -ll   # must not list any local disk
```

:::note
- NVMe/TCP does not use `dm-multipath`. It uses native NVMe multipath, which is already enabled in the Harvester kernel, and doesn't need `nvme-cli` on the host.
- NFS needs no host configuration.
:::

**Check that every node has a unique iSCSI initiator name.** Nodes cloned from the same image can end up with the same name in `/etc/iscsi/initiatorname.iscsi`. ONTAP then treats those nodes as a single host. If you change a node's IQN, restart that node's `trident-node-linux` pod afterwards. Trident caches the IQN, and with a stale one volume staging fails with `no devices present yet`.

## 2. Install the Trident operator

```shell
helm repo add netapp-trident https://netapp.github.io/trident-helm-chart
helm repo update
helm search repo netapp-trident --versions | head

helm upgrade --install trident netapp-trident/trident-operator --version <chart version> \
  --namespace trident --create-namespace --wait
```

Pick a version from the `helm search` output above rather than pinning one in this article; this procedure was tested with chart `100.2606.1` (Trident 26.06.1).

Wait until the `trident-controller` pod and one `trident-node-linux` pod per node are `Running`:

```shell
kubectl -n trident get pods -o wide
```

:::info Optional: run the node plugin only on selected nodes
By default, the `trident-node-linux` DaemonSet tolerates all `NoSchedule` and `NoExecute` taints, so it runs on every node, including a [witness node](https://docs.harvesterhci.io/v1.9/advanced/witness). A witness node only runs etcd and never mounts volumes, so you may want to keep Trident off it. The same approach works for keeping Trident on any subset of nodes that host NetApp-backed VMs.

Label the nodes that should mount NetApp volumes, then pass the label to the chart:

```shell
kubectl label node <node-1> <node-2> netapp-trident=enabled --overwrite

helm upgrade --install trident netapp-trident/trident-operator --version <chart version> \
  --namespace trident --create-namespace --wait \
  --set tridentNodePluginNodeSelector.netapp-trident=enabled
```

When you add a node to the cluster later, label it too. Otherwise VMs scheduled on it cannot mount NetApp volumes.

If you use a [dedicated storage interface](#optional-a-dedicated-storage-interface-with-hostnetworkconfig), use the same label as the HostNetworkConfig `nodeSelector`. Then the nodes that run Trident and the nodes with an IP on the storage network are always the same set.

VMs using NetApp volumes must only run on the labelled nodes. A Harvester witness node never runs VMs, so this needs no extra configuration in the witness case.
:::

## 3. Create the ONTAP credentials Secret

```shell
kubectl -n trident create secret generic netapp-creds \
  --from-literal=username=<ontap user> \
  --from-literal=password='<ontap password>'
```

## 4. Create the backends

Create one `TridentBackendConfig` per protocol you use; you can drop any you don't need.

A few things the examples below deliberately leave out:

- **`spaceReserve: none` and `snapshotReserve: "0"`**: these are already Trident's defaults, so setting them changes nothing. (Don't confuse `snapshotReserve` with thin provisioning, either — it reserves extra space on the ONTAP volume so a PVC's filesystem doesn't run out of room as Snapshot copies grow, it isn't what makes the volume thin.)
- **`limitAggregateUsage`**: this stops Trident from creating new volumes once an aggregate passes a given percent used, but aggregates are cluster-level ONTAP objects, so it only works with a **cluster-scoped** `admin` login — strictly more access than Trident needs for anything else in this article. On all-flash aggregates there's also no performance cliff near 80% full the way there was with spinning disks, so there's less reason to want it. Watch aggregate usage with your normal ONTAP monitoring instead.
- **`svm` and `dataLIF`**: not needed if `managementLIF` already points at an SVM-scoped management LIF (Trident infers the SVM from that LIF) and the SVM has only one data LIF per protocol, which is the recommended design. If your SVM has several LIFs for the same protocol, set `dataLIF` on the NFS backend to pick one explicitly (see [Network design](#network-design)).
- **`nfsMountOptions`**: this is a Trident-side fallback, not the Kubernetes-native way to set mount options — it doesn't show up in the resulting PV's `mountOptions` field. Set mount options on the StorageClass instead (step 5).

If several Kubernetes or Harvester clusters share one SVM, give each cluster a unique `backendName` and set `storagePrefix` (for example `storagePrefix: hv1_`). That keeps volume names from colliding and makes each cluster's volumes easy to identify in ONTAP.

For **Fibre Channel**, copy the iSCSI backend below, then change `name` and `backendName` (for example to `netapp-fc`) and set `sanType: fcp`. Then add a matching StorageClass in step 5 with `sanType: fcp`. FC was not tested for this article.

Save as `03-backends.yaml`, replacing the `<...>` values:

```yaml
# NFS
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: netapp-nas
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-nas
  backendName: netapp-nas
  managementLIF: <SVM management LIF IP>
  autoExportPolicy: true
  autoExportCIDRs: ["<storage network CIDR>"]
  credentials:
    name: netapp-creds
---
# iSCSI (all iSCSI LIFs in the SVM are discovered; no dataLIF)
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: netapp-iscsi
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-san
  sanType: iscsi
  backendName: netapp-iscsi
  managementLIF: <SVM management LIF IP>
  credentials:
    name: netapp-creds
---
# NVMe/TCP (all NVMe LIFs in the SVM are discovered; no dataLIF)
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: netapp-nvme
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-san
  sanType: nvme
  backendName: netapp-nvme
  managementLIF: <SVM management LIF IP>
  credentials:
    name: netapp-creds
```

```shell
kubectl apply -f 03-backends.yaml
kubectl -n trident get tridentbackendconfigs
```

Every backend must report `PHASE` `Bound` and `STATUS` `Success`. If one doesn't, `kubectl -n trident describe tridentbackendconfig <name>` shows the error.

## 5. Create the StorageClasses and VolumeSnapshotClass

A StorageClass with only `backendType: ontap-san` can place a volume on **any** SAN backend: iSCSI, NVMe/TCP or FC. Pin each class to a protocol with the `sanType` parameter (`iscsi`, `nvme` or `fcp`) instead of matching backends by name with `storagePools` — it's the more direct mechanism and keeps working if you ever rename a backend. `storagePools` is still the right tool if you run multiple SVMs and need to steer volumes to one of them.

For the NFS class, add `fsType: "nfs"`. It's not needed to mount the volume, but without it Kubernetes skips applying a pod's `fsGroup` to the volume (no setgid bit, no group ownership change) — worth the one extra line. Mount options for NFS also belong here, as the StorageClass's top-level `mountOptions`, not on the backend.

Save as `04-storageclasses.yaml`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: netapp-nfs
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-nas"
  fsType: "nfs"
mountOptions:
  - nfsvers=4.1
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: netapp-iscsi
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-san"
  sanType: "iscsi"
  fsType: "ext4"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: netapp-nvme
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-san"
  sanType: "nvme"
  fsType: "ext4"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: trident-snapshotclass
driver: csi.trident.netapp.io
deletionPolicy: Delete
```

```shell
kubectl apply -f 04-storageclasses.yaml
```

Live migration requires `ReadWriteMany` volumes. CDI already knows Trident's defaults:

- `ontap-san` (iSCSI, NVMe/TCP and FC): `ReadWriteMany` with `volumeMode: Block`.
- `ontap-nas`: `ReadWriteMany` with `volumeMode: Filesystem`.

So these StorageClasses don't need the `cdi.harvesterhci.io/storageProfileVolumeModeAccessModes` annotation. None of the other `cdi.harvesterhci.io/storageProfile*` annotations from older third-party storage write-ups are needed either — check `kubectl get storageprofile <storageclass> -o yaml` after creating the class, and its `status` is already filled in (access modes, `cloneStrategy: snapshot`, `snapshotClass`) because CDI recognizes `csi.trident.netapp.io` directly. The separate `storageclass.kubevirt.io/is-default-virt-class` annotation is unrelated to any of this — it only matters if you want a NetApp class, instead of Longhorn, to be the default for new VM disks.

## 6. Register Trident for Harvester VM snapshots

Harvester needs to know which `VolumeSnapshotClass` to use for Trident volumes.

1. In the Harvester UI, go to **Advanced > Settings**, find **csi-driver-config**, and select **⋮ > Edit Setting**.
1. Click **Add**, then fill in the fields:
   - **Provisioner**: `csi.trident.netapp.io`
   - **Volume Snapshot Class Name**: `trident-snapshotclass`
1. Save.

Leave **Backup Volume Snapshot Class Name** empty. In Harvester v1.9, VM backups only work with Longhorn volumes. VM snapshots of Trident volumes work. See [Third-Party Storage Support](https://docs.harvesterhci.io/v1.9/advanced/csidriver#configure-harvester-cluster).

The resulting entry in the setting's JSON value is:

```json
"csi.trident.netapp.io": {
  "volumeSnapshotClassName": "trident-snapshotclass",
  "backupVolumeSnapshotClassName": ""
}
```

## 7. Use it

The new StorageClasses now appear when you create a volume, a VM image or a VM in the Harvester UI. A quick check:

1. Create a VM whose root disk uses `netapp-iscsi`, `netapp-nvme` or `netapp-nfs`.
1. Start the VM, live-migrate it to another node, and take a VM snapshot.
1. On a node running the VM, `multipath -ll` (iSCSI) or `ls /sys/class/nvme-subsystem` (NVMe) shows the NetApp devices.

## Troubleshooting

- **Backends go `offline` after the ONTAP system was unreachable.** If they don't recover on their own, restart the controller: `kubectl -n trident rollout restart deploy/trident-controller`.
- **Deleted volumes still use space on ONTAP.** ONTAP keeps deleted volumes in the volume recovery queue for 12 hours. While a deleted FlexClone (such as a VM disk cloned from an image) sits in the queue, its parent snapshot stays busy, so the parent volume and its `VolumeSnapshot` can't be deleted. To free them immediately, run on ONTAP: `set -privilege advanced; volume recovery-queue purge-all -vserver <svm name>`.
- **`multipath -ll` lists local disks.** `multipathd` was started without the NetApp-only configuration. Put `98-netapp.conf` in place, flush the unused maps with `multipath -F`, and restart `multipathd`.
- **iSCSI volumes fail to stage with `no devices present yet`.** Check for duplicate initiator names across nodes, and for a stale IQN in Trident (see step 1).

## References

- [NetApp Trident documentation](https://docs.netapp.com/us-en/trident/)
- [Deploy the Trident operator using Helm](https://docs.netapp.com/us-en/trident/trident-install/kubernetes-deploy-helm.html)
- [ONTAP SAN driver](https://docs.netapp.com/us-en/trident/trident-use/ontap-san.html) and [ONTAP NAS driver](https://docs.netapp.com/us-en/trident/trident-use/ontap-nas.html)
- [Harvester third-party storage support](https://docs.harvesterhci.io/v1.9/advanced/csidriver)
