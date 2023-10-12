---
title: Additional workload deployment on Harvester Host Cluster
description: Recommendation on deployment of additional workloads on Harvester Cluster 
slug: additional_workload_deployment_on_harvester
authors:
  - name: Devendra Kulkarni
    title: Technical Support Engineer
    url: https://github.com/devenkulkarni
    image_url: https://github.com/devenkulkarni.png
tags: [harvester, workloads, host, cluster , resources, WebUI]
hide_table_of_contents: false
---

While it is technically possible to deploy additional worklaods on the Harvester Host Cluster, running other workloads or microservices in the same Kubernetes cluster where Harvester is deployed on is not officially supported yet.

Moreover, deployment of other microservices or workloads may invite following risks: 
(1) They might not be well integrated and tested on Harvester. Additionally, users need to deploy and troubleshoot them on their own.
(2) Potential conflict with existing features of Harvester. For instance, high system resource consumption can cause downtime.
(3) No WebUI support, all operations can only be achieved via kubectl or other CLI tools.
(4) During system upgrade, they would not be covered.

Hence, best practice is to deploy Harvester seperately without any additional workloads. Although, we have an experimental feature allowing you to deploy additional workload on Harvester Host Cluster (Bare Metal) in Harvester v1.2.0 and for more information on it, please review the [blog](https://www.suse.com/c/rancher_blog/harvester-v1-2-0-release/) and our official documentation [Harvester baremetal container workload support](https://docs.harvesterhci.io/v1.2/rancher/index/#harvester-baremetal-container-workload-support-experimental).
