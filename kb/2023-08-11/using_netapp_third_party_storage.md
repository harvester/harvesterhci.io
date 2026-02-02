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

This article covers instructions for installing the Netapp Astra Trident CSI driver into a Harvester cluster, which enables NetApp storage systems to store storage volumes usable by virtual machines running in Harvester.

The NetApp storage will be an option in addition to the normal Longhorn storage; it will not replace Longhorn. Virtual machine images will still be stored using Longhorn.

This has been tested with Harvester 1.2.0 and Trident v23.07.0.

This procedure only works to access storage via iSCSI, not NFS.

:::note
3rd party storage classes (including those based on Trident) can only be used for non-boot volumes of Harvester VMs.
:::

# Detailed Instructions

We assume that before beginning this procedure, a Harvester cluster and a NetApp ONTAP storage system are both installed and configured for use.

Most of these steps can be performed on any system with the `helm` and `kubectl` commands installed and network connectivity to the management port of the Harvester cluster.  Let's call this your workstation.  Certain steps must be performed on one or more cluster nodes themselves.  The steps described below should be done on your workstation unless otherwise indicated.

The last step (enabling multipathd) should be done on all nodes after the Trident CSI has been installed.

Certain parameters of your installation will require modification of details in the examples in the procedure given below. Those which you may wish to modify include:

* The namespace.  `trident` is used as the namespace in the examples, but you may prefer to use another.
* The name of the deployment. `mytrident` is used but you can change this to something else.
* The management IP address of the ONTAP storage system
* Login credentials (username and password) of the ONTAP storage system

The procedure is as follows.

1. Read the NetApp Astra Trident documentation:

   * https://docs.netapp.com/us-en/trident/
   * https://docs.netapp.com/us-en/trident/trident-get-started/kubernetes-deploy-operator.html
   * https://docs.netapp.com/us-en/trident/trident-get-started/kubernetes-deploy-helm.html#deploy-the-trident-operator-and-install-astra-trident-using-helm

   The simplest method is to install using Helm; that process is described here.

1. Download the KubeConfig from the Harvester cluster.

   * Open the web UI for your Harvester cluster
   * In the lower left corner, click the "Support" link.  This will take you to a "Harvester Support" page.
   * Click the button labeled "Download KubeConfig".  This will download a your cluster config in a file called "local.yaml" by default.
   * Move this file to a convenient location and set your `KUBECONFIG` environment variable to the path of this file.

1. Prepare the cluster for installation of the Helm chart.

   Before starting installation of the helm chart, special authorization must be provided to enable certain modifications to be made during the installation.
   This addresses the issue described here: https://github.com/NetApp/trident/issues/839

   * Put the following text into a file.  For this example we'll call it `authorize_trident.yaml`.

      ```yaml
      ---
      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRole
      metadata:
        name: trident-operator-psa
      rules:
      - apiGroups:
        - management.cattle.io
        resources:
        - projects
        verbs:
        - updatepsa
      ---
      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: trident-operator-psa
      roleRef:
        apiGroup: rbac.authorization.k8s.io
        kind: ClusterRole
        name: trident-operator-psa
      subjects:
      - kind: ServiceAccount
        name: trident-operator
        namespace: trident
      ```

   * Apply this manifest via the command `kubectl apply -f authorize_trident.yaml`.

1. Install the helm chart.

   * First you will need to add the Astra Trident Helm repository:

      ```shell
      helm repo add netapp-trident https://netapp.github.io/trident-helm-chart
      helm repo update
      ```

   * Set these variables for the Helm chart you are installing:

      ```shell
      helm search repo netapp-trident --versions
      ```
      ```shell
      export CHART_VERSION=""
      export APP_VERSION=""
      ```

   * Next, install the Helm chart.  This example uses `trident` as the deployment name, `trident` as the namespace, and 100.2406.1 as the Helm chart version to install:

      ```shell
      helm install trident netapp-trident/trident-operator --version ${CHART_VERSION} --create-namespace --namespace trident
      ```

   * The NetApp documentation describes variations on how you can do this.

1. Download and extract the tridentctl command, which will be needed for the next few steps.

   This and the next few steps need to be performed logged into a master node of the Harvester cluster, using root access.

   ```shell
   cd /tmp
   curl -L -o trident-installer-${APP_VERSION}.tar.gz https://github.com/NetApp/trident/releases/download/v${APP_VERSION}/trident-installer-${APP_VERSION}.tar.gz
   tar -xf trident-installer-${APP_VERSION}.tar.gz
   cd trident-installer
   ```

1. Install a backend.

   This part is specific to Harvester.

   1. Create the following text file:

      ```yaml
      cat <<EOF> /tmp/backend.yaml
      version: 1
      backendName: default_backend_san
      storageDriverName: <<ontap-san-economy or ontap-san>>
      managementLIF: <<ADMIN_IPADDRESS>>  ## Often the same as the storage UI IP address
      dataLIF: <<DATA_IPADDRESS>>  ## IP assigned to the iSCSI-only SVM
      svm: <<SVM_NAME>>
      username: <<ONTAP storage admin user>>
      password: <<password>>
      labels:
      name: default_backend_san
      EOF
      ```

    Update the IP addresses, SVM name, username, and password in this file
    with the appropriate values for the the ONTAP system.

   1. Create the backend

      ```shell
      ./tridentctl create backend -f /tmp/backend.yaml -n trident
      ```
   * A successful completion of the command will result in an output similar to the following:
      ```text
      +------------------------+----------------+--------------------------------------+--------+---------+
      |          NAME          | STORAGE DRIVER |                 UUID                 | STATE  | VOLUMES |
      +------------------------+----------------+--------------------------------------+--------+---------+
      | default_backend_san    | ontap-san      | 6788533c-7fea-4a35-b797-fb9bb3322b91 | online |       0 |
      +------------------------+----------------+--------------------------------------+--------+---------+
      ```

   1. You can verify the status of the backend at any time with:

      ```shell
      ./tridentctl get backend -n trident
      ```

     * You should see an output similar to the output for a successful backend creation.

1. Define a StorageClass and SnapshotClass.

   1. Put the following into a file, for example `/tmp/storage.yaml`

      ```yaml
      ---
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: ontap-san
      provisioner: csi.trident.netapp.io
      parameters:
        backendType: <<"ontap-san" or "ontap-san-economy">>
      allowVolumeExpansion: true
      ---
      apiVersion: snapshot.storage.k8s.io/v1
      kind: VolumeSnapshotClass
      metadata:
        name: csi-snapclass
      driver: csi.trident.netapp.io
      deletionPolicy: Delete
      ```
    Select the correct value for the backendType in this file before applying.

   1. Apply the definitions:

      ```shell
      kubectl apply -f /tmp/storage.yaml
      ```

1. Enable multipathd

   The following is required to enable multipathd.
   This must be done on every node of the Harvester cluster, using root access.
   The preceding steps should only be done once on a single node.

   1. Create this file in `/oem/99_multipathd.yaml`:

      ```yaml
      stages:
         initramfs:
         - name: "Setup multipathd"
            systemctl:
               enable:
               - multipathd
               start:
               - multipathd
      ```

   1. Configure `multipathd` to exclude pathnames used by Longhorn.

      This part is a little tricky.  `multipathd` will automatically discover
      device names matching a certain pattern, and attempt to set up multipathing on them.
      Unfortunately, Longhorn's device names follow the same pattern, and
      will not work correctly if `multipathd` tries to use those devices.

      Therefore the file `/etc/multipath.conf` must be set up on each node
      so as to prevent `multipathd` from touching any of the devices
      that Longhorn will use.  Unfortunately, it is not possible to know
      in advance which device names will be used until the volumes are attached
      to a VM when the VM is started, or when the volumes are hot-added to a running VM.
      The recommended method is to "whitelist" the Trident devices using device
      properties rather than device naming.  The properties to allow are the
      device vendor and product.  Here is an example of what you'll want in `/etc/multipath.conf`:

       ```text
       blacklist {
           device {
               vendor "!NETAPP"
               product "!LUN"
           }
       }
       blacklist_exceptions {
           device {
               vendor "NETAPP"
               product "LUN"
           }
       }
       ```

       This example only works if NetApp is the only storage provider in the system for which `multipathd` must be used.  More complex environments will require more complex configuration.

       Explicitly putting that content into `/etc/multipath.conf` will work when you start `multipathd` as described below, but the change in `/etc` will not persist across node reboots.  To solve that problem, you should add another file to `/oem` that will re-generate `/etc/multipath.conf` when the node reboots.  The following example will create the `/etc/multipath.conf` given in the example above, but may need to be modified for your environment if you have a more complex iSCSI configuration:

       ```text
       stages:
          initramfs:
            - name: "Configure multipath blacklist and whitelist"
              files:
              - path: /etc/multipath.conf
                permissions: 0644
                owner: 0
                group: 0
                content: |
                  blacklist {
                      device {
                          vendor "!NETAPP"
                          product "!LUN"
                       }
                   }
                   blacklist_exceptions {
                       device {
                           vendor "NETAPP"
                           product "LUN"
                       }
                   }
       ```

       Remember, this has to be done on every node.

   1. Enable multipathd.

    Adding the above files to `/oem` will take effect on the next reboot of the node; `multipathd` can be enabled immediately without rebooting the node using the following commands:

      ```shell
      systemctl enable multipathd
      systemctl start multipathd
      ```

      After the above steps, the `ontap-san-economy` storage class should be available when creating a volume for a Harvester VM.
