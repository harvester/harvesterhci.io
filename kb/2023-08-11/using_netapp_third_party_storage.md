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

Most of these steps can be performed on any system that has the `helm` and `kubectl` commands installed, and which has network connectivity to the management port of the Harvester cluster.  Let's call this your workstation.  Certain steps must be performed on one or more cluster nodes themselves.  The steps described below should be done on your workstation unless otherwise indicated.

The last step (setting up multipathd) should be done on all nodes,
after the Trident CSI has been installed.

Certain parameters of your installation will require modification of details in the examples in the procedure given below. This which you may wish to modify include:

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
      ```

   * Next, install the Helm cart.  This example uses `mytrident` as the deployment name, `trident` as the namespace, and 23.07.0 as the version number to install:

      ```shell
      helm install mytrident netapp-trident/trident-operator --version 23.07.0 --create-namespace --namespace trident
      ```

   * The NetApp documentation describes variations on how you can do this.

1. Download and extract the tridentctl command, which will be needed for the next few steps:

   ```shell
   cd /tmp
   curl -L -o trident-installer-23.07.0.tar.gz https://github.com/NetApp/trident/releases/download/v23.07.0/trident-installer-23.07.0.tar.gz
   tar -xf trident-installer-23.07.0.tar.gz
   cd trident-installer
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

   1. Put the following into a file, for example `/tmp/storage.yaml`

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

       This is only an example that works if NetApp is the only storage provider in the system
       for which `multipathd` must be used.  More complex environments will require
       more complex configuration.

       Explicitly putting that content into `/etc/multipath.conf` will work when you start `multipathd` as described below,
       but the change in `/etc` will not persist across node reboots.  To solve that problem, you should add another
       file to `/oem` that will re-generate `/etc/multipath.conf` when the node reboots.  The following example
       will create the `/etc/multipath.conf` given in the example above, but may need to be modified for your
       environment if you have a more complex iSCSI configuration:

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

       Again, this has to be done on every node.

   1. Enable multipathd

    Adding the above files to `/oem` will take effect on the next reboot of the node;
    `multipathd` can be enabled immediately without rebooting the node
    using the following commands:

      ```shell
      systemctl enable multipathd
      systemctl start multipathd
      ```

      After the above steps, the `ontap-san-economy` storage class should be available for use when creating a volume for a Harvester VM.
