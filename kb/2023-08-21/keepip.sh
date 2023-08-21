#!/bin/bash

set -e

default_cluster_name="kubernetes"

load_balancer_name() {
    clusterName="$1"
    serviceNamespace="$2"
    serviceName="$3"
    serviceUID="$4"

    maxNameLength=63
    lenOfSuffix=8

    if ! echo "$base" | grep -q "^[a-zA-Z]"; then
        base="a$base"
    fi

    base="${clusterName}-${serviceNamespace}-${serviceName}-"
    checksum=$(echo -n "$base$serviceUID" | gzip -1 -c | tail -c8 | hexdump -n4 -e '"%08x"')

    if [[ ${#base} -gt $((maxNameLength - lenOfSuffix)) ]]; then
        base="${base:0:$((maxNameLength - lenOfSuffix))}"
    fi

    echo "${base}${checksum}"
}

merge_yaml() {
    harvesterKubeconfig="$1"
    rke2Kubeconfig="$2"
    yq eval-all '. as $item ireduce ({}; . *+ $item)' $1 $2 > merged.yaml
    export KUBECONFIG=merged.yaml
}

switch_to_downstream_cluster() {
    kubectl config use-context "${cluster_name}"
}

switch_to_harvester() {
    kubectl config use-context local
}

upgrade_harvester_cloud_provider() {
    version=$(helm list -n kube-system -o json | jq -r '.[] | select(.name == "harvester-cloud-provider") | .chart')
    helm upgrade harvester-cloud-provider https://github.com/harvester/charts/releases/download/$version/$version.tgz -n kube-system
}

# Update the annotations and delete the LoadBalancer for a DHCP service
update_dhcp_service() {
    local name=$1
    local namespace=$2
    local uid=$3
    local lb_name=$(load_balancer_name "$default_cluster_name" "$namespace" "$name" "$uid")

    switch_to_harvester
    local annotations=$(kubectl get svc "$lb_name" -n "$cluster_namespace" -o yaml | yq eval '.metadata.annotations')
    local hwaddr=$(echo "$annotations" | yq eval '.["kube-vip.io/hwaddr"]' -r)
    local requestedIP=$(echo "$annotations" | yq eval '.["kube-vip.io/requestedIP"]' -r)
    echo $hwaddr $requestedIP
    switch_to_downstream_cluster
    kubectl annotate --overwrite svc "$name" -n "$namespace" "kube-vip.io/hwaddr=$hwaddr" "kube-vip.io/requestedIP=$requestedIP" 

    # delete the LoadBalancer
    switch_to_harvester
    kubectl delete lb "$lb_name" -n "$cluster_namespace"
}

# Update the allocatedHistory for a pool service
update_pool_service() {
    local name=$1
    local namespace=$2
    local uid=$3
    local lb_name=$(load_balancer_name "$default_cluster_name" "$cluster_namespace" "$name" "$uid")
    local new_lb_name=$(load_balancer_name "$cluster_name" "$cluster_namespace" "$name" "$uid")

    switch_to_harvester
    local annotations=$(kubectl get svc "$lb_name" -n "$cluster_namespace" -o yaml | yq eval '.metadata.annotations')
    local ip=$(kubectl get svc "$lb_name" -n "$cluster_namespace" -o yaml | yq eval '.status.loadBalancer.ingress[0].ip' -r)
    local pool_name=$(kubectl get lb "$lb_name" -n "$cluster_namespace" -o yaml | yq eval '.status.allocatedAddress.ipPool' -r)

    echo $ip $pool_name
    echo $lb_name $new_lb_name

    kubectl delete lb "$lb_name" -n "$cluster_namespace"

    # update allocated history
    kubectl patch pool "$pool_name" -n "$cluster_namespace" --type json -p '[{"op": "replace", "path": "/status/allocatedHistory/'"$ip"'", "value": '"$cluster_namespace/$new_lb_name"'}]'
}

delete_all_lb() {
    cluster_name="$1"
    cluster_namespace="$2"

    switch_to_downstream_cluster
    kubectl get service -A -o yaml |
    yq -r '.items[] | select(.spec.type == "LoadBalancer") | [.metadata.name, .metadata.namespace, .metadata.uid] | @tsv' |
        while IFS=$'\t' read -r name namespace uid; do
            lb_name=$(load_balancer_name "$default_cluster_name" "$namespace" "$name" "$uid")
            switch_to_harvester
            kubectl delete lb "$lb_name" -n "$cluster_namespace"
        done
}

before_upgrade() {
    switch_to_downstream_cluster
    kubectl scale deploy harvester-cloud-provider --replicas=0 -n kube-system
    # Loop through the LoadBalancer services in the downstream cluster
    kubectl get service -A -o yaml |
    yq -r '.items[] | select(.spec.type == "LoadBalancer") | [.metadata.name, .metadata.namespace, .metadata.uid, .metadata.annotations["cloudprovider.harvesterhci.io/ipam"]] | @tsv' |
        while IFS=$'\t' read -r name namespace uid mode; do
            if [ "$mode" == "dhcp" ]; then
                echo "Updating DHCP service $name in namespace $namespace"
                update_dhcp_service "$name" "$namespace" "$uid"
            elif [ "$mode" == "pool" ]; then
                echo "Updating pool service $name in namespace $namespace"
                update_pool_service "$name" "$namespace" "$uid"
            else
                echo "Skipping service $name in namespace $namespace"
                continue
            fi
        done
}

after_upgrade() {
    switch_to_downstream_cluster
    kubectl scale deploy harvester-cloud-provider --replicas=0 -n kube-system

    delete_all_lb "$cluster_name" "$cluster_namespace"

    switch_to_downstream_cluster
    helm upgrade harvester-cloud-provider harvester/harvester-cloud-provider -n kube-system --set global.cattle.clusterName="${cluster_name}" --set cloudConfigPath=/var/lib/rancher/rke2/etc/config-files/cloud-provider-config
}

if [ $# -ne 5 ]; then
    echo "Usage: $0 <period> <harvester-kubeconfig-path> <downstream-cluster-kubeconfig-path> <cluster-name> <cluster-namespace>"
    echo "Available period: before_upgrade, after_upgrade"
    exit 1
fi

period="$1"
harvester_kubeconfig_path="$2"
downstream_cluster_kubeconfig_path="$3"
cluster_name="$4"
cluster_namespace="$5"

merge_yaml "$harvester_kubeconfig_path" "$downstream_cluster_kubeconfig_path"

case "$period" in
    before_upgrade)
        before_upgrade "$harvester_kubeconfig_path" "$downstream_cluster_kubeconfig_path" "$cluster_name" "$cluster_namespace"
        ;;
    after_upgrade)
        after_upgrade "$harvester_kubeconfig_path" "$downstream_cluster_kubeconfig_path" "$cluster_name" "$cluster_namespace"
        ;;
    *)
        echo "Invalid arguments: $period"
        exit 1
        ;;
esac

rm -rf merged.yaml
    