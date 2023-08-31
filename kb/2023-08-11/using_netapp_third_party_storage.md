---
title: Using NetApp Storage on Harvester
description: Installation procedure for NetApp Astra Trident CSI Driver
slug: install_netapp_trident_csi
authors:
  - name: Jeff Radick
    title: Staff Software Engineer
tags: [harvester]
hide_table_of_contents: false
---

Instructions for installing the Netapp Astra Trident CSI driver into a Harvester cluster.

This enables use of NetApp storage systems to store storage volumes usable by virtual machines running in Harvester.

The NetApp storage will be an option in addition to the normal Longhorn storage; it will not replace Longhorn. Virtual machine images will still be stored using Longhorn.

This has been tested with Harvester 1.2.0 and Trident v23.07.0.

This procedure only works to access storage via iSCSI, not NFS.

:::note
3rd party storage classes (including those based on Trident) can only be used for non-boot volumes of Harvester VMs.
:::

# Detailed Instructions

We are assuming that before beginning this procedure,
a Harvester cluster and a NetApp ONTAP storage system
are both installed and configured for use.

Follow all of the following steps, but ONLY on the initial cluster node.

The last step (setting up multipathd) should be done on all nodes,
AFTER the initial node has had Trident installed.

1. Read the NetApp Astra Trident documentation
       https://docs.netapp.com/us-en/trident/
       https://docs.netapp.com/us-en/trident/trident-get-started/kubernetes-deploy-operator.html
   We are describing the "manual deployment" procedure here.
1. Log into the Harvester cluster in one of the nodes.
1. Download and extract the Trident software into /tmp on the Harvester node.
   Note that the Harvester node will not have "wget" but it does have
   "curl", so the command to download the software is adjusted accordingly:

   ```shell
   cd /tmp
   curl -L -o trident-installer-23.07.0.tar.gz https://github.com/NetApp/trident/releases/download/v23.07.0/trident-installer-23.07.0.tar.gz
   tar -xf trident-installer-23.07.0.tar.gz
   cd trident-installer
   ```

1. Prepare, install Trident, and verify the installation
   This part is a summary of the relevant steps from the NetApp Trident
   website.
   1. Create the TridentOrchestrator CRD.

      ```shell
      kubectl create -f deploy/crds/trident.netapp.io_tridentorchestrators_crd_post1.16.yaml
      ```

   1. Deploy the Trident operator (assuming the "trident" namespace)

      ```shell
      # kubectl apply -f deploy/namespace.yaml
      kubectl apply -f deploy/bundle_post_1_25.yaml
      ```

      The operator, deployment, and replicasets can be verified with:

      ```shell
      kubectl get all -n trident
      ```

   1. Create the TridentOrchestrator and install Trident

      ```shell
      kubectl create -f deploy/crds/tridentorchestrator_cr.yaml
      ```

      This will take a while (a few minutes); you can check progress with

         ```shell
         kubectl desribe torc trident
         ```

      The last few lines of output will tell you whether the installation
      has completed successfully.  When it has finished, the last few
      lines should look something like this:

         ```shell
         Events:
            Type Reason Age From Message ---- ------ ---- ---- -------Normal
            Installing 74s trident-operator.netapp.io Installing Trident Normal
            Installed 67s trident-operator.netapp.io Trident installed
         ```

   1. Verify the installation

      ```shell
      kubectl get pods -n trident
      ./tridentctl -n trident version
      ```

1. Install a backend.
   This part is specific to Harvester.
   1. Put the following into a text file, for example /tmp/backend.yaml

      ```yaml
      version: 1
      backendName: default_backend_san
      storageDriverName: ontap-san-economy
      managementLIF: 172.19.97.114
      svm: default_backend
      username: admin
      password: password1234
      labels:
      name: default_backend_san
      ```

    The LIF IP address, username, and password of this file
    should be replaced with the management LIF and credentials
    for the ONTAP system.

   1. Create the backend

      ```shell
      ./tridentctl create backend -f /tmp/backend.yaml -n trident
      ```

   1. Check that it is created

      ```shell
      ./tridentctl get backend -n trident
      ```

1. Define a StorageClass and SnapshotClass.
   1. Put the following into a file, for example /tmp/storage.yaml

      ```yaml
      ---
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
      name: ontap-san-economy
      provisioner: csi.trident.netapp.io
      parameters:
      selector: "name=default_backend_san"
      ---
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshotClass
      metadata:
      name: csi-snapclass
      driver: csi.trident.netapp.io
      deletionPolicy: Delete
      ```

   1. Apply the definitions:

      ```shell
      kubectl apply -f /tmp/storage.yaml
      ```

1. Enable multipathd
   The following is required to enable multipathd.
   This must be done on every node of the Harvester cluster.
   The preceding steps should only be done once on a single node.
   1. Create this file in `/oem/99_multipathd.yaml`:

      ```yaml
      stages:
         default:
         - name: "Setup multipathd"
            systemctl:
               enable:
               - multipathd
               start:
               - multipathd
      ```

   1. Enable multipathd
    The above file will take effect on the next reboot of the node;
    multipathd can be enabled immediately without rebooting the node
    using the following commands:

      ```shell
      systemctl enable multipathd
      systemctl start multipathd
      ```

      After the above steps, the `ontap-san-economy` storage class should be available for use when creating a volume for a Harvester VM.
