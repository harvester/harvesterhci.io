---
title: Additional workload deployment on Harvester host cluster
description: Recommendation on the deployment of additional workloads on the Harvester cluster 
slug: additional_workload_deployment_on_harvester
authors:
  - name: Devendra Kulkarni
    title: Technical Support Engineer
    url: https://github.com/devenkulkarni
    image_url: https://github.com/devenkulkarni.png
tags: [harvester, workloads, host, cluster, resources, WebUI]
hide_table_of_contents: false
---

While it is technically possible to deploy additional workloads on the Harvester host cluster, running other workloads or microservices in the same Kubernetes cluster where Harvester is deployed is not officially supported yet.

Moreover, the deployment of other microservices or workloads may invite the following risks: 
1. They might not be well integrated and tested on Harvester. Additionally, users need to deploy and troubleshoot them on their own.
2. Potential conflict with existing features of Harvester. For instance, high system resource consumption can cause downtime.
3. No WebUI support, all operations can only be achieved via kubectl or other CLI tools.
4. During system upgrades, they would not be covered. For example, if your workload depends on the Kubernetes version, a Harvester upgrade could require a newer version of Kubernetes, which may break your custom workload.

Hence, the best practice is to deploy Harvester separately without any additional workloads. Although, we have an experimental feature allowing you to deploy additional workload on Harvester host cluster (bare metal) in Harvester v1.2.0 and for more information on it, please review the [blog](https://www.suse.com/c/rancher_blog/harvester-v1-2-0-release/) and our official documentation [Harvester baremetal container workload support](https://docs.harvesterhci.io/v1.2/rancher/index/#harvester-baremetal-container-workload-support-experimental).
