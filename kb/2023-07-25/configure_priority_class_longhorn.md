---
title: Configure PriorityClass on Longhorn System Components
description: Configure priority classes on Longhorn system components
slug: configure_priority_class_longhorn
authors:
  - name: Kiefer Chang
    title: Engineer Manager
    url: https://github.com/bk201
    image_url: https://github.com/bk201.png
tags: [harvester, longhorn, "priority class"]
hide_table_of_contents: false
---

**Harvester v1.2.0**  introduces a new enhancement where Longhorn system-managed components in newly-deployed clusters are automatically assigned a `system-cluster-critical` priority class by default. However, when upgrading your Harvester clusters from previous versions, you may notice that Longhorn system-managed components do not have any priority class set.

This behavior is intentional and aimed at supporting zero-downtime upgrades. Longhorn does not allow changing the `priority-class` setting when attached volumes exist. For more details, please refer to [Setting Priority Class During Longhorn Installation](https://longhorn.io/docs/1.4.3/advanced-resources/deploy/priority-class/#setting-priority-class-during-longhorn-installation)).

This article explains how to manually configure priority classes for Longhorn system-managed components after upgrading your Harvester cluster, ensuring that your Longhorn components have the appropriate priority class assigned and maintaining the stability and performance of your system.

## Stop all virtual machines

Stop all virtual machines (VMs) to detach all volumes. Please back up any work before doing this.
1. [Login to a Harvester controller node and become root](https://docs.harvesterhci.io/v1.1/troubleshooting/os#how-to-log-into-a-harvester-node).
2. Get all running VMs and write down their namespaces and names:

  ```bash
  kubectl get vmi -A
  ```

Alternatively, you can get this information by backing up the Virtual Machine Instance (VMI) manifests with the following command:
    ```bash
    kubectl get vmi -A -o json > vmi-backup.json
    ```

3. Shut down all VMs. Log in to all running VMs and shut them down gracefully (recommended). Or use the following command to send shutdown signals to all VMs:
  ```bash
  kubectl get vmi -A -o json | jq -r '.items[] | [.metadata.name, .metadata.namespace] | @tsv' | while IFS=$'\t' read -r name namespace; do
        if [ -z "$name" ]; then
          break
        fi
        echo "Stop ${namespace}/${name}"
        virtctl stop $name -n $namespace
      done
  ```

  :::note
    You can also stop all VMs from the Harvester UI:
    1. Go to the "Virtual Machines" page.
    2. For each VM, select **⋮** > **Stop**.
  :::

4. Ensure there are no running VMs:

  Run the command:

  ```bash
  kubectl get vmi -A
  ```

  The above command must return:

  ```bash
  No resources found

## Scale down monitoring pods

1. Scale down the Prometheus deployment. Run the following command and wait for all Prometheus pods to terminate:

  ```bash
  kubectl patch -n cattle-monitoring-system prometheus/rancher-monitoring-prometheus --patch '{"spec": {"replicas": 0}}' --type merge && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system statefulset/prometheus-rancher-monitoring-prometheus
  ```

  A sample output looks like this:

  ```
  prometheus.monitoring.coreos.com/rancher-monitoring-prometheus patched
  statefulset rolling update complete 0 pods at revision prometheus-rancher-monitoring-prometheus-cbf6bd5f7...
  ```

2. Scale down the AlertManager deployment. Run the following command and wait for all AlertManager pods to terminate:

  ```bash
  kubectl patch -n cattle-monitoring-system alertmanager/rancher-monitoring-alertmanager --patch '{"spec": {"replicas": 0}}' --type merge && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system statefulset/alertmanager-rancher-monitoring-alertmanager
  ```

  A sample output looks like this:

  ```
  alertmanager.monitoring.coreos.com/rancher-monitoring-alertmanager patched
  statefulset rolling update complete 0 pods at revision alertmanager-rancher-monitoring-alertmanager-c8c459dff...
  ```

3. Scale down the Grafana deployment. Run the following command and wait for all Grafana pods to terminate:

  ```bash
  kubectl scale --replicas=0 deployment/rancher-monitoring-grafana -n cattle-monitoring-system && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system deployment/rancher-monitoring-grafana
  ```

  A sample output looks like this:

  ```
  deployment.apps/rancher-monitoring-grafana scaled
  deployment "rancher-monitoring-grafana" successfully rolled out
  ```

## Scale down vm-import-controller pods

1. Check if the [`vm-import-controller` addon](https://docs.harvesterhci.io/v1.1/advanced/vmimport) is enabled and configured with a persistent volume with the following command:

```bash
kubectl get pvc -n harvester-system harvester-vm-import-controller
```

If the above command returns an output like this, you must scale down the `vm-import-controller` pod. Otherwise, you can skip the following step.
```
NAME                             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS         AGE
harvester-vm-import-controller   Bound    pvc-eb23e838-4c64-4650-bd8f-ba7075ab0559   200Gi      RWO            harvester-longhorn   2m53s
```

2. Scale down the `vm-import-controller` pods with the following command:

```bash
kubectl scale --replicas=0 deployment/harvester-vm-import-controller -n harvester-system && \
    sleep 5 && \
    kubectl rollout status --watch=true -n harvester-system deployment/harvester-vm-import-controller
```

A sample output looks like this:

```
deployment.apps/harvester-vm-import-controller scaled
deployment "harvester-vm-import-controller" successfully rolled out
```

## Set the `priority-class` setting

1. Before applying the `priority-class` setting, you need to verify all volumes are detached. Run the following command to verify the `STATE` of each volume is `detached`:

```bash
kubectl get volumes.longhorn.io -A
```

Verify the output looks like this:
```
NAMESPACE         NAME                                       STATE      ROBUSTNESS   SCHEDULED   SIZE           NODE   AGE
longhorn-system   pvc-5743fd02-17a3-4403-b0d3-0e9b401cceed   detached   unknown                  5368709120            15d
longhorn-system   pvc-7e389fe8-984c-4049-9ba8-5b797cb17278   detached   unknown                  53687091200           15d
longhorn-system   pvc-8df64e54-ecdb-4d4e-8bab-28d81e316b8b   detached   unknown                  2147483648            15d
longhorn-system   pvc-eb23e838-4c64-4650-bd8f-ba7075ab0559   detached   unknown                  214748364800          11m
```

1. Set the `priority-class` setting with the following command:

```bash
kubectl patch -n longhorn-system settings.longhorn.io priority-class --patch '{"value": "system-cluster-critical"}' --type merge
```

Longhorn system-managed pods will restart and then you need to check if all the system-managed components have a priority class set:

Get the value of the priority class `system-cluster-critical`:
```bash
kubectl get priorityclass system-cluster-critical
```

Verify the output looks like this:
```
NAME                      VALUE        GLOBAL-DEFAULT   AGE
system-cluster-critical   2000000000   false            15d
```

3. Use the following command to get pods' priority in the `longhorn-system` namespace:

```bash
kubectl get pods -n longhorn-system -o custom-columns="Name":metadata.name,"Priority":.spec.priority
```

4. Verify all system-managed components' pods have the correct priority. System-managed components include:
- `csi-attacher`
- `csi-provisioner`
- `csi-resizer`
- `csi-snapshotter`
- `engine-image-ei`
- `instance-manager-e`
- `instance-manager-r`
- `longhorn-csi-plugin`

## Scale up vm-import-controller pods

If you scale down the `vm-import-controller` pods, you must scale it up again. 

1. Scale up the `vm-import-controller` pod. Run the command: 

  ```bash
  kubectl scale --replicas=1 deployment/harvester-vm-import-controller -n harvester-system && \
      sleep 5 && \
      kubectl rollout status --watch=true -n harvester-system deployment/harvester-vm-import-controller
  ```

  A sample output looks like this:

  ```
  deployment.apps/harvester-vm-import-controller scaled
  Waiting for deployment "harvester-vm-import-controller" rollout to finish: 0 of 1 updated replicas are available...
  deployment "harvester-vm-import-controller" successfully rolled out
  ```

2. Verify `vm-import-controller` is running using the following command:
  ```bash
  kubectl get pods --selector app.kubernetes.io/instance=vm-import-controller -A
  ```

  A sample output looks like this, the pod's `STATUS` must be `Running`:
  ```
  NAMESPACE          NAME                                              READY   STATUS    RESTARTS   AGE
  harvester-system   harvester-vm-import-controller-6bd8f44f55-m9k86   1/1     Running   0          4m53s
  ```

## Scale up monitoring pods

1. Scale up the Prometheus deployment. Run the following command and wait for all Prometheus pods to roll out:

  ```bash
  kubectl patch -n cattle-monitoring-system prometheus/rancher-monitoring-prometheus --patch '{"spec": {"replicas": 1}}' --type merge && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system statefulset/prometheus-rancher-monitoring-prometheus
  ```

  A sample output looks like:
  ```
  prometheus.monitoring.coreos.com/rancher-monitoring-prometheus patched
  Waiting for 1 pods to be ready...
  statefulset rolling update complete 1 pods at revision prometheus-rancher-monitoring-prometheus-cbf6bd5f7...
  ```

2. Scale down the AlertManager deployment. Run the following command and wait for all AlertManager pods to roll out:

  ```bash
  kubectl patch -n cattle-monitoring-system alertmanager/rancher-monitoring-alertmanager --patch '{"spec": {"replicas": 1}}' --type merge && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system statefulset/alertmanager-rancher-monitoring-alertmanager
  ```

  A sample output looks like this:

  ```
  alertmanager.monitoring.coreos.com/rancher-monitoring-alertmanager patched
  Waiting for 1 pods to be ready...
  statefulset rolling update complete 1 pods at revision alertmanager-rancher-monitoring-alertmanager-c8bd4466c...
  ```

3. Scale down the Grafana deployment. Run the following command and wait for all Grafana pods to roll out:

  ```bash
  kubectl scale --replicas=1 deployment/rancher-monitoring-grafana -n cattle-monitoring-system && \
      sleep 5 && \
      kubectl rollout status --watch=true -n cattle-monitoring-system deployment/rancher-monitoring-grafana
  ```

  A sample output looks like this:

  ```
  deployment.apps/rancher-monitoring-grafana scaled
  Waiting for deployment "rancher-monitoring-grafana" rollout to finish: 0 of 1 updated replicas are available...
  deployment "rancher-monitoring-grafana" successfully rolled out
  ```

## Start virtual machines

1. Start a VM with the command:

  ```bash
  virtctl start $name -n $namespace
  ```

Replace `$name` with the VM's name and `$namespace` with the VM's namespace. You can list all virtual machines with the command:

  ```bash
  kubectl get vms -A
  ```

  :::note
   You can also stop all VMs from the Harvester UI:
    1. Go to the "Virtual Machines" page.
    2. For each VM, select **⋮** > **Start**.
  :::

Alternatively, you can start all running VMs with the following command:

  ```bash
  cat vmi-backup.json | jq -r '.items[] | [.metadata.name, .metadata.namespace] | @tsv' | while IFS=$'\t' read -r name namespace; do
        if [ -z "$name" ]; then
          break
        fi
        echo "Start ${namespace}/${name}"
        virtctl start $name -n $namespace || true
      done
  ```
