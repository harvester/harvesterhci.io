---
title: VM Scheduling
description: How does Harvester schedule VMs?
slug: vm-scheduling
authors:
  - name: PoAn Yang
    title: Software Engineer
    url: https://github.com/FrankYang0529
    image_url: https://github.com/FrankYang0529.png
tags: [vm, scheduling]
hide_table_of_contents: false
---

# VM Scheduling in Harvester

## How does Harvester schedule a VM?

Harvester doesn't directly schedule a VM in Kubernetes, it relies on [KubeVirt](http://kubevirt.io/) to create the custom resource `VirtualMachine`. When the request to create a new VM is sent, a `VirtualMachineInstance` object is created and it creates the corresponding `Pod`.

The whole VM creation processt leverages `kube-scheduler`, which allows Harvester to use `nodeSelector`, `affinity`, and resources request/limitation to influence where a VM will be deployed.

## How does kube-scheduler decide where to deploy a VM?

First, `kube-scheduler` finds Nodes available to run a pod. After that, `kube-scheduler` scores each available Node by a list of [plugins](https://github.com/kubernetes/kubernetes/tree/v1.22.7/pkg/scheduler/framework/plugins) like [ImageLocality](https://github.com/kubernetes/kubernetes/blob/v1.22.7/pkg/scheduler/framework/plugins/imagelocality/image_locality.go), [InterPodAffinity](https://github.com/kubernetes/kubernetes/tree/v1.22.7/pkg/scheduler/framework/plugins/interpodaffinity), [NodeAffinity](https://github.com/kubernetes/kubernetes/tree/v1.22.7/pkg/scheduler/framework/plugins/nodeaffinity), etc. 

Finally, `kube-scheduler` calculates the scores from the plugins results for each Node, and select the Node with the highest score to deploy the Pod.

For example, let's say  we have a three nodes Harvester cluster with 6 cores CPU and 16G RAM each, and we want to deploy a VM with 1 CPU and 1G RAM (without resources overcommit). 

`kube-scheduler` will summarize the scores, as displayed in  _Table 1_ below, and will select the node with the highest score, `harvester-node-2` in this case, to deploy the VM.

<details>
  <summary>kube-scheduler logs</summary>

```
virt-launcher-vm-without-overcommit-75q9b -> harvester-node-0: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 0,
virt-launcher-vm-without-overcommit-75q9b -> harvester-node-1: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 45,
virt-launcher-vm-without-overcommit-75q9b -> harvester-node-2: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5350 memory:5941231616] ,score 46,

virt-launcher-vm-without-overcommit-75q9b -> harvester-node-0: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 4,
virt-launcher-vm-without-overcommit-75q9b -> harvester-node-1: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 34,
virt-launcher-vm-without-overcommit-75q9b -> harvester-node-2: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5350 memory:5941231616] ,score 37,

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="ImageLocality" node="harvester-node-0" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="ImageLocality" node="harvester-node-1" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="ImageLocality" node="harvester-node-2" score=54

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="InterPodAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="InterPodAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="InterPodAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesLeastAllocated" node="harvester-node-0" score=4
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesLeastAllocated" node="harvester-node-1" score=34
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesLeastAllocated" node="harvester-node-2" score=37

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodePreferAvoidPods" node="harvester-node-0" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodePreferAvoidPods" node="harvester-node-2" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodePreferAvoidPods" node="harvester-node-1" score=1000000

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="PodTopologySpread" node="harvester-node-0" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="PodTopologySpread" node="harvester-node-1" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="PodTopologySpread" node="harvester-node-2" score=200

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="TaintToleration" node="harvester-node-0" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="TaintToleration" node="harvester-node-1" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="TaintToleration" node="harvester-node-2" score=100

"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesBalancedAllocation" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesBalancedAllocation" node="harvester-node-1" score=45
"Plugin scored node for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" plugin="NodeResourcesBalancedAllocation" node="harvester-node-2" score=46

"Calculated node's final score for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" node="harvester-node-0" score=1000358
"Calculated node's final score for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" node="harvester-node-1" score=1000433
"Calculated node's final score for pod" pod="default/virt-launcher-vm-without-overcommit-75q9b" node="harvester-node-2" score=1000437

AssumePodVolumes for pod "default/virt-launcher-vm-without-overcommit-75q9b", node "harvester-node-2"
AssumePodVolumes for pod "default/virt-launcher-vm-without-overcommit-75q9b", node "harvester-node-2": all PVCs bound and nothing to do
"Attempting to bind pod to node" pod="default/virt-launcher-vm-without-overcommit-75q9b" node="harvester-node-2"
```
</details>

**Table 1 - kube-scheduler scores example**

|                                 | harvester-node-0 | harvester-node-1 | harvester-node-2 |
|:-------------------------------:|:----------------:|:----------------:|:----------------:|
| ImageLocality                   |               54 |               54 |               54 |
| InterPodAffinity                |                0 |                0 |                0 |
| NodeResourcesLeastAllocated     |                4 |               34 |               37 |
| NodeAffinity                    |                0 |                0 |                0 |
| NodePreferAvoidPods             |          1000000 |          1000000 |          1000000 |
| PodTopologySpread               |              200 |              200 |              200 |
| TaintToleration                 |              100 |              100 |              100 |
| NodeResourcesBalancedAllocation |                0 |               45 |               46 |
| Total                           |          1000358 |          1000433 |          1000437 |

## Why VMs are distributed unevenly with overcommit?

With resources overcommit, Harvester modifies the resources request. By default, the `overcommit` configuration is `{"cpu": 1600, "memory": 150, "storage":  200}`. This means that if we request a VM with 1 CPU and 1G RAM, its `resources.requests.cpu` will become `62m`. 

:::note
The unit suffix `m` stands for "thousandth of a core."
:::

To explain it, let's take the case of CPU overcommit. The default value of 1 CPU is equal to 1000m CPU, and with the default overcommit configuration of `"cpu": 1600`, the CPU resource will be 16x smaller. Here is the calculation: `1000m * 100 / 1600 = 62m`.

Now, we can see how overcommitting influences `kube-scheduler` scores.

In this example, we use a three nodes Harvester cluster with 6 cores and 16G RAM each. We will deploy two VMs with 1 CPU and 1G RAM, and we will compare the scores for both cases of "with-overcommit" and "without-overcommit" resources. 

The results of both tables _Table 2_ and _Table 3_ can be explained as follow:

In the "with-overcommit" case, both VMs are deployed on `harvester-node-2`, however in the "without-overcommit" case, the VM1 is deployed on `harvester-node-2`, and VM2 is deployed on `harvester-node-1`. 

If we look at the detailed scores, we'll see a variation of `Total Score` for `harvester-node-2` from `1000459` to `1000461` in the "with-overcommit" case, and `1000437` to `1000382` in the "without-overcommit case". It's because resources overcommit influences `request-cpu` and `request-memory`. 

In the "with-overcommit" case, the `request-cpu` changes from `4412m` to `4474m`. The difference between the two numbers is `62m`, which is what we calculated above. However, in the "without-overcommit" case, we send **real** requests to `kube-scheduler`, so the `request-cpu` changes from `5350m` to `6350m`.

Finally, since most plugins give the same scores for each node except `NodeResourcesBalancedAllocation` and `NodeResourcesLeastAllocated`, we'll see a difference of these two scores for each node.

From the results, we can see the overcommit feature influences the final score of each Node, so VMs are distributed unevenly. Although the `harvester-node-2` score for VM 2 is higher than VM 1, it's not always increasing. In _Table 4_, we keep deploying VM with 1 CPU and 1G RAM, and we can see the score of `harvester-node-2` starts decreasing from 11th VM. The behavior of `kube-scheduler` depends on your cluster resources and the workload you deployed.

<details>
  <summary>kube-scheduler logs for vm1-with-overcommit</summary>

```
virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-0: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9022 memory:14807289856] ,score 0,
virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-1: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4622 memory:5992960000] ,score 58,
virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-2: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4412 memory:5581918208] ,score 59,

virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-0: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9022 memory:14807289856] ,score 5,
virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-1: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4622 memory:5992960000] ,score 43,
virt-launcher-vm1-with-overcommit-ljlmq -> harvester-node-2: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4412 memory:5581918208] ,score 46,

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="InterPodAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="InterPodAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="InterPodAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-0" score=5
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-1" score=43
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-2" score=46

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodePreferAvoidPods" node="harvester-node-0" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodePreferAvoidPods" node="harvester-node-1" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodePreferAvoidPods" node="harvester-node-2" score=1000000

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="PodTopologySpread" node="harvester-node-0" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="PodTopologySpread" node="harvester-node-1" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="PodTopologySpread" node="harvester-node-2" score=200

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="TaintToleration" node="harvester-node-0" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="TaintToleration" node="harvester-node-1" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="TaintToleration" node="harvester-node-2" score=100

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-1" score=58
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-2" score=59

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="ImageLocality" node="harvester-node-0" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="ImageLocality" node="harvester-node-1" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" plugin="ImageLocality" node="harvester-node-2" score=54

"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" node="harvester-node-0" score=1000359
"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" node="harvester-node-1" score=1000455
"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" node="harvester-node-2" score=1000459

AssumePodVolumes for pod "default/virt-launcher-vm1-with-overcommit-ljlmq", node "harvester-node-2"
AssumePodVolumes for pod "default/virt-launcher-vm1-with-overcommit-ljlmq", node "harvester-node-2": all PVCs bound and nothing to do
"Attempting to bind pod to node" pod="default/virt-launcher-vm1-with-overcommit-ljlmq" node="harvester-node-2"
```
</details>

<details>
  <summary>kube-scheduler logs for vm2-with-overcommit</summary>

```
virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-0: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9022 memory:14807289856] ,score 0,
virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-1: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4622 memory:5992960000] ,score 58,
virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-2: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4474 memory:6476701696] ,score 64,

virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-0: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9022 memory:14807289856] ,score 5,
virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-1: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4622 memory:5992960000] ,score 43,
virt-launcher-vm2-with-overcommit-pwrx4 -> harvester-node-2: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:4474 memory:6476701696] ,score 43,

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodePreferAvoidPods" node="harvester-node-0" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodePreferAvoidPods" node="harvester-node-1" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodePreferAvoidPods" node="harvester-node-2" score=1000000

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="PodTopologySpread" node="harvester-node-0" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="PodTopologySpread" node="harvester-node-1" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="PodTopologySpread" node="harvester-node-2" score=200

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="TaintToleration" node="harvester-node-0" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="TaintToleration" node="harvester-node-1" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="TaintToleration" node="harvester-node-2" score=100

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesBalancedAllocation" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesBalancedAllocation" node="harvester-node-1" score=58
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesBalancedAllocation" node="harvester-node-2" score=64

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="ImageLocality" node="harvester-node-0" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="ImageLocality" node="harvester-node-1" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="ImageLocality" node="harvester-node-2" score=54

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="InterPodAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="InterPodAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="InterPodAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesLeastAllocated" node="harvester-node-0" score=5
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesLeastAllocated" node="harvester-node-1" score=43
"Plugin scored node for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" plugin="NodeResourcesLeastAllocated" node="harvester-node-2" score=43

"Calculated node's final score for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" node="harvester-node-0" score=1000359
"Calculated node's final score for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" node="harvester-node-1" score=1000455
"Calculated node's final score for pod" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" node="harvester-node-2" score=1000461

AssumePodVolumes for pod "default/virt-launcher-vm2-with-overcommit-pwrx4", node "harvester-node-2"
AssumePodVolumes for pod "default/virt-launcher-vm2-with-overcommit-pwrx4", node "harvester-node-2": all PVCs bound and nothing to do
"Attempting to bind pod to node" pod="default/virt-launcher-vm2-with-overcommit-pwrx4" node="harvester-node-2"
```
</details>

<details>
  <summary>kube-scheduler logs for vm1-without-overcommit</summary>

```
virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-0: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 0,
virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-1: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 45,
virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-2: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5350 memory:5941231616] ,score 46,

virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-0: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 4,
virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-1: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 34,
virt-launcher-vm1-with-overcommit-6xqmq -> harvester-node-2: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5350 memory:5941231616] ,score 37,

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="InterPodAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="InterPodAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="InterPodAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-0" score=4
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-1" score=34
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesLeastAllocated" node="harvester-node-2" score=37

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodePreferAvoidPods" node="harvester-node-0" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodePreferAvoidPods" node="harvester-node-1" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodePreferAvoidPods" node="harvester-node-2" score=1000000

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="PodTopologySpread" node="harvester-node-0" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="PodTopologySpread" node="harvester-node-1" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="PodTopologySpread" node="harvester-node-2" score=200

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="TaintToleration" node="harvester-node-0" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="TaintToleration" node="harvester-node-1" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="TaintToleration" node="harvester-node-2" score=100

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-1" score=45
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="NodeResourcesBalancedAllocation" node="harvester-node-2" score=46

"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="ImageLocality" node="harvester-node-0" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="ImageLocality" node="harvester-node-1" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" plugin="ImageLocality" node="harvester-node-2" score=54

"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" node="harvester-node-0" score=1000358
"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" node="harvester-node-1" score=1000433
"Calculated node's final score for pod" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" node="harvester-node-2" score=1000437

AssumePodVolumes for pod "default/virt-launcher-vm1-with-overcommit-6xqmq", node "harvester-node-2"
AssumePodVolumes for pod "default/virt-launcher-vm1-with-overcommit-6xqmq", node "harvester-node-2": all PVCs bound and nothing to do
"Attempting to bind pod to node" pod="default/virt-launcher-vm1-with-overcommit-6xqmq" node="harvester-node-2"
```
</details>

<details>
  <summary>kube-scheduler logs for vm2-without-overcommit</summary>

```
virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-0: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 0,
virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-1: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 45,
virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-2: NodeResourcesBalancedAllocation, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:6350 memory:7195328512] ,score 0,

virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-0: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:9960 memory:15166603264] ,score 4,
virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-1: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:5560 memory:6352273408] ,score 34,
virt-launcher-vm2-without-overcommit-mf5vk -> harvester-node-2: NodeResourcesLeastAllocated, map of allocatable resources map[cpu:6000 memory:16776437760], map of requested resources map[cpu:6350 memory:7195328512] ,score 28,

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="PodTopologySpread" node="harvester-node-0" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="PodTopologySpread" node="harvester-node-1" score=200
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="PodTopologySpread" node="harvester-node-2" score=200

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="TaintToleration" node="harvester-node-0" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="TaintToleration" node="harvester-node-1" score=100
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="TaintToleration" node="harvester-node-2" score=100

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesBalancedAllocation" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesBalancedAllocation" node="harvester-node-1" score=45
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesBalancedAllocation" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="ImageLocality" node="harvester-node-0" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="ImageLocality" node="harvester-node-1" score=54
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="ImageLocality" node="harvester-node-2" score=54

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="InterPodAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="InterPodAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="InterPodAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesLeastAllocated" node="harvester-node-0" score=4
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesLeastAllocated" node="harvester-node-1" score=34
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeResourcesLeastAllocated" node="harvester-node-2" score=28

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeAffinity" node="harvester-node-0" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeAffinity" node="harvester-node-1" score=0
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodeAffinity" node="harvester-node-2" score=0

"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodePreferAvoidPods" node="harvester-node-0" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodePreferAvoidPods" node="harvester-node-1" score=1000000
"Plugin scored node for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" plugin="NodePreferAvoidPods" node="harvester-node-2" score=1000000

"Calculated node's final score for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" node="harvester-node-0" score=1000358
"Calculated node's final score for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" node="harvester-node-1" score=1000433
"Calculated node's final score for pod" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" node="harvester-node-2" score=1000382

AssumePodVolumes for pod "default/virt-launcher-vm2-without-overcommit-mf5vk", node "harvester-node-1"
AssumePodVolumes for pod "default/virt-launcher-vm2-without-overcommit-mf5vk", node "harvester-node-1": all PVCs bound and nothing to do
"Attempting to bind pod to node" pod="default/virt-launcher-vm2-without-overcommit-mf5vk" node="harvester-node-1"
```
</details>

**Table 2 - With Overcommit**

|              VM 1 / VM 2              |          harvester-node-0 |        harvester-node-1 |        harvester-node-2 |
|:-------------------------------------:|--------------------------:|------------------------:|------------------------:|
|            request-cpu (m)            |               9022 / 9022 |             4622 / 4622 |             **4412** / **4474** |
|             request-memory            | 14807289856 / 14807289856 | 5992960000 / 5992960000 | **5581918208** / **6476701696** |
| NodeResourcesBalancedAllocation Score |                     0 / 0 |                 58 / 58 |                 **59** / **64** |
|   NodeResourcesLeastAllocated Score   |                     5 / 5 |                 43 / 43 |                 **46** / **43** |
| Other Scores                          |         1000354 / 1000354 |       1000354 / 1000354 |       1000354 / 1000354 |
|              Total Score              |         1000359 / 1000359 |       1000455 / 1000455 |       **1000459** / **1000461** |

**Table 3 - Without Overcommit**

|              VM 1 / VM 2              |          harvester-node-0 |        harvester-node-1 |        harvester-node-2 |
|:-------------------------------------:|--------------------------:|------------------------:|------------------------:|
|            request-cpu (m)            |               9960 / 9960 |             5560 / **5560** |             **5350** / 6350 |
|             request-memory            | 15166603264 / 15166603264 | 6352273408 / **6352273408** | **5941231616** / 7195328512 |
| NodeResourcesBalancedAllocation Score |                     0 / 0 |                 45 / **45** |                  **46** / 0 |
|   NodeResourcesLeastAllocated Score   |                     4 / 4 |                 34 / **34** |                 **37** / 28 |
| Other Scores                          |         1000354 / 1000354 |       1000354 / **1000354** |       **1000354** / 1000354 |
|              Total Score              |         1000358 / 1000358 |       1000358 / **1000433** |       **1000437** / 1000382 |

**Table 4**

| Score | harvester-node-0 | harvester-node-1 | harvester-node-2 |
|:-----:|-----------------:|-----------------:|-----------------:|
|  VM 1 |          1000359 |          1000455 |          1000459 |
|  VM 2 |          1000359 |          1000455 |          1000461 |
|  VM 3 |          1000359 |          1000455 |          1000462 |
|  VM 4 |          1000359 |          1000455 |          1000462 |
| VM 5  |          1000359 |          1000455 |          1000463 |
|  VM 6 |          1000359 |          1000455 |          1000465 |
| VM 7  |          1000359 |          1000455 |          1000466 |
| VM 8  |          1000359 |          1000455 |          1000467 |
| VM 9  |          1000359 |          1000455 |          1000469 |
| VM 10 |          1000359 |          1000455 |          1000469 |
| VM 11 |          1000359 |          1000455 |      **1000465** |
| VM 12 |          1000359 |          1000455 |      **1000457** |


## How to avoid uneven distribution of VMs?

There are many plugins in `kube-scheduler` which we can use to influence the scores. For example, we can add the `podAntiAffinity` plugin to avoid VMs with the same labels being deployed on the same node.

```
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: harvesterhci.io/creator
              operator: Exists
          topologyKey: kubernetes.io/hostname
        weight: 100
```

## How to see scores in kube-scheduler?

`kube-scheduler` is deployed as a static pod in Harvester. The file is under `/var/lib/rancher/rke2/agent/pod-manifests/kube-scheduler.yaml` in each Management Node. We can add `- --v=10` to the `kube-scheduler` container to show score logs.

```
kind: Pod
metadata:
  labels:
    component: kube-scheduler
    tier: control-plane
  name: kube-scheduler
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-scheduler
    # ...
    - --v=10
```
