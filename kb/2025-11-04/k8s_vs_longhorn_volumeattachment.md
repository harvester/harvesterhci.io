# Kubernetes VolumeAttachment vs Longhorn VolumeAttachment

When working with Longhorn, you may encounter two different VolumeAttachment resources with similar names: **Kubernetes VolumeAttachment** (`storage.k8s.io/v1`) and **Longhorn VolumeAttachment** (`longhorn.io/v1beta2`). This often causes confusion about why both exist, when each is created, whether they always appear together, and which one to check when troubleshooting. This document clarifies their distinct roles, shows how they work together (and when they don't), and provides real-world examples to help you identify attachment sources and effectively troubleshoot volume attachment issues.

> **Recommended Reading**: For additional context, see the official documentation at https://longhorn.io/docs/1.10.0/advanced-resources/volumeattachment/

---

## Workflow: How K8s and Longhorn VolumeAttachments Work Together

When a Pod requires a Longhorn volume, two separate VolumeAttachment resources work together to complete the attachment process. The Kubernetes VolumeAttachment represents the CSI standard attachment request, while the Longhorn VolumeAttachment manages the actual attachment orchestration with ticket-based coordination.

The following diagram illustrates the complete flow from Pod scheduling to successful volume attachment:

```
┌─────────────────────────────────────────────────────────────┐
│                  Pod Scheduled to Node                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Attach/Detach Controller                         │
│ Creates K8s VolumeAttachment                                │
│   APIVersion: storage.k8s.io/v1                             │
│   Spec:                                                     │
│     Attacher: driver.longhorn.io                            │
│     NodeName: worker-node-1                                 │
│     Source.PersistentVolumeName: pvc-xxx                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ CSI External-Attacher (Longhorn)                            │
│ Watches K8s VolumeAttachment                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn CSI Plugin                                         │
│ Calls ControllerPublishVolume()                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn Manager API                                        │
│ Creates/Updates Longhorn VolumeAttachment                   │
│   APIVersion: longhorn.io/v1beta2                           │
│   Spec:                                                     │
│     Volume: my-volume                                       │
│     AttachmentTickets:                                      │
│       csi-attacher-<hash>:                                  │
│         ID: <pod-id>                                        │
│         Type: csi-attacher                                  │
│         NodeID: worker-node-1                               │
│         Parameters: {...}                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn VolumeAttachment Controller                        │
│ 1. Evaluates all attachment tickets                         │
│ 2. Selects appropriate ticket to satisfy                    │
│ 3. Updates Volume.Spec.NodeID = worker-node-1               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn Volume Controller                                  │
│ Performs actual volume attachment operation                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn VolumeAttachment Controller                        │
│ Updates ticket status: Satisfied = true                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn CSI Plugin                                         │
│ Returns attach success to external-attacher                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ CSI External-Attacher                                       │
│ Updates K8s VolumeAttachment.Status.Attached = true         │
└─────────────────────────────────────────────────────────────┘
```

The resulting Longhorn VolumeAttachment YAML:

```yaml
apiVersion: longhorn.io/v1beta2
kind: VolumeAttachment
metadata:
  name: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  namespace: longhorn-system
  labels:
    longhornvolume: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
spec:
  volume: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  attachmentTickets:
    # This CSI ticket was triggered by K8s VolumeAttachment (Pod binding)
    csi-3d3120f43480db87c91a6902d670c35899917c03f9f6f81db7bf26d9d66e45ec:
      id: csi-3d3120f43480db87c91a6902d670c35899917c03f9f6f81db7bf26d9d66e45ec
      type: csi-attacher
      nodeID: harvester-node-1
      parameters:
        disableFrontend: "false"
status:
  attachmentTicketStatuses:
    csi-3d3120f43480db87c91a6902d670c35899917c03f9f6f81db7bf26d9d66e45ec:
      id: csi-3d3120f43480db87c91a6902d670c35899917c03f9f6f81db7bf26d9d66e45ec
      satisfied: true  # Volume successfully attached
      conditions:
      - type: Satisfied
        status: "True"
```

Notice the `csi-attacher` ticket type - this confirms the attachment was triggered by Kubernetes VolumeAttachment through the CSI flow, not by Longhorn internal operations.

### Trigger Points

Understanding when each VolumeAttachment is created or modified is crucial for troubleshooting attachment issues:

1. **K8s VolumeAttachment Creation**: Triggered when Pod is scheduled to a node requiring a PVC
   - Managed by Kubernetes Attach/Detach (AD) Controller
   - One VolumeAttachment per PV-node combination
   - Represents Kubernetes' intent to attach the volume

2. **Longhorn VolumeAttachment Ticket Addition**: Triggered by various Longhorn components based on operation needs:
   - **CSI Plugin** - when CSI ControllerPublishVolume is called
   - **Snapshot Controller** - when creating snapshots of detached volumes
   - **Backup Controller** - when backing up volumes
   - **UI/API** - when users manually attach volumes via Longhorn UI
   - **Clone Controller** - when managing source volume during clone
   - **Restore Controller** - when restoring data from backups
   - **Expansion Controller** - when expanding volume size
   - And other Longhorn controllers based on their specific operational needs

### Example: VolumeSnapshot Creation (Longhorn VolumeAttachment Only)

**Important**: VolumeSnapshot operations use **only Longhorn VolumeAttachment** without involving Kubernetes VolumeAttachment. This demonstrates that Longhorn VolumeAttachment can operate independently for internal operations.

```
┌─────────────────────────────────────────────────────────────┐
│           User Creates VolumeSnapshot via kubectl           │
│           kubectl apply -f volumesnapshot.yaml              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn Snapshot Controller                                │
│ Detects new VolumeSnapshot resource                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Snapshot Controller Checks Volume State                     │
│ If Volume is detached → needs attachment for snapshot       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Snapshot Controller Creates Attachment Ticket               │
│ Updates Longhorn VolumeAttachment:                          │
│   AttachmentTickets:                                        │
│     snapshot-<snapshot-name>:                               │
│       Type: snapshot-controller                             │
│       NodeID: <volume-owner-node>                           │
│       Parameters: {disableFrontend: "false"}                │
│                                                             │
│ ❌ No K8s VolumeAttachment created                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn VolumeAttachment Controller                        │
│ Selects snapshot ticket → Updates Volume.Spec.NodeID        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Longhorn Volume Controller                                  │
│ Attaches volume → Starts Engine                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Snapshot Controller                                         │
│ Engine running → Creates snapshot via Engine API            │
│ Snapshot complete → Removes attachment ticket               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Volume May Auto-Detach (if no other tickets exist)          │
└─────────────────────────────────────────────────────────────┘
```

The Longhorn VolumeAttachment YAML during snapshot creation:

**During Snapshot Creation** (ticket exists):
```yaml
apiVersion: longhorn.io/v1beta2
kind: VolumeAttachment
metadata:
  name: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  namespace: longhorn-system
  generation: 30
spec:
  volume: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  attachmentTickets:
    # Temporary ticket created by Snapshot Controller
    snapshot-controller-snapshot-a36bedf5-fb3b-4b30-a10d-ed98f9c0323a:
      id: snapshot-controller-snapshot-a36bedf5-fb3b-4b30-a10d-ed98f9c0323a
      type: snapshot-controller
      nodeID: harvester-node-1
      parameters:
        disableFrontend: any
status:
  attachmentTicketStatuses:
    snapshot-controller-snapshot-a36bedf5-fb3b-4b30-a10d-ed98f9c0323a:
      id: snapshot-controller-snapshot-a36bedf5-fb3b-4b30-a10d-ed98f9c0323a
      satisfied: false  # Snapshot in progress
      conditions:
      - type: Satisfied
        status: "False"
```

**After Snapshot Completes** (ticket removed):
```yaml
apiVersion: longhorn.io/v1beta2
kind: VolumeAttachment
metadata:
  name: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  namespace: longhorn-system
  generation: 31  # Incremented after ticket removal
spec:
  volume: pvc-0b9c8d59-0ae8-413c-8bc5-af32b932b8ab
  attachmentTickets: {}  # Ticket removed after snapshot completes
status:
  attachmentTicketStatuses: {}
```

**Key Observations**:
- The `snapshot-controller` ticket type clearly identifies this as a Longhorn internal operation
- Unlike `csi-attacher` tickets (triggered by K8s), this ticket is created purely by Longhorn
- The ticket is **temporary** - it appears during snapshot creation and disappears when complete
- No corresponding Kubernetes VolumeAttachment exists for this operation

---

## Summary

Longhorn uses **two different VolumeAttachment resources** for different purposes:

**Kubernetes VolumeAttachment** (`storage.k8s.io/v1`) follows the standard CSI specification and is created **only** when Pods are scheduled to nodes. It represents Kubernetes' official attachment intent and is managed by K8s Attach/Detach Controller and CSI External-Attacher.

**Longhorn VolumeAttachment** (`longhorn.io/v1beta2`) extends beyond CSI to support Longhorn's advanced features. It's created for **multiple scenarios** including Pod workloads, snapshots, backups, clones, and manual operations. It uses a ticket-based system to coordinate concurrent attachment requests and is managed collaboratively by multiple Longhorn controllers.

**Why both are needed:** K8s VolumeAttachment ensures CSI compliance with the Kubernetes ecosystem, while Longhorn VolumeAttachment enables automation for background operations without manual intervention. Importantly, not all Longhorn operations trigger K8s VolumeAttachment—for example, creating a VolumeSnapshot only creates a Longhorn VolumeAttachment ticket (`snapshot-controller`), not a K8s VolumeAttachment.

**When troubleshooting:** Check both resources. K8s VolumeAttachment shows the CSI standard workflow status, while Longhorn VolumeAttachment shows the complete picture including all internal operations via attachment tickets. Look at the ticket **type** to identify the operation source: `csi-attacher` means triggered by K8s VolumeAttachment (Pod workload), while `snapshot-controller`, `backup-controller`, etc. indicate Longhorn internal operations.
