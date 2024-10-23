---
title: Renew Harvester Cloud Credentials
description: How to renew expired Harvester cloud credentials when using Rancher 2.8.x.
slug: renew_harvester_cloud_credentials
authors:
  - name: Gaurav Mehta
    title: Staff Software Engineer
    url: https://github.com/ibrokethecloud
    image_url: https://github.com/ibrokethecloud.png
  - name: Moritz Röhrich 
    title: Senior Quality Assurance Engineer
    url: https://github.com/m-ildefons
    image_url: https://github.com/m-ildefons.png
tags: [harvester, cloud credentials, rancher]
hide_table_of_contents: false
---

## Expiration of kubeconfig Tokens in Rancher 2.8.x

In Rancher 2.8.x, the default value of the [kubeconfig-default-token-ttl-minutes](https://ranchermanager.docs.rancher.com/api/api-tokens#kubeconfig-default-token-ttl-minutes) setting is `30` days.

A side effect of using this default value is the expiration of authentication tokens embedded in kubeconfigs that Rancher uses to provision guest Kubernetes clusters on Harvester. When such tokens expire, Rancher loses the ability to perform management operations for the corresponding Rancher-managed guest Kubernetes clusters. [Issue #44912](https://github.com/rancher/rancher/issues/44912) tracks the issue described in this article.

:::note
The issue affects only guest Kubernetes clusters running on Harvester that use cloud credentials created after installing or upgrading to Rancher v2.8.x.
:::

## Workaround

You can patch the expired Harvester cloud credentials to use a new authentication token.

1. Identify the expired cloud credentials and which Harvester cluster is
   affected by them.

  ![identify-credentials](./imgs/identify-cloud-credential.png)

1. Download a new kubeconfig file for the affected Harvester cluster.

  ![context-menu](./imgs/harvester-renew-kubeconfig-menu.png)

1. Patch the cloud credentials. The cloud credential is stored as a secret in `cattle-global-data` namespace, and can be replaced with the new kubeconfig file. Ensure that the environment variable `KUBECONFIG_FILE` contains the path to the new kubeconfig file.

  ```shell
  #!/bin/sh
  CLOUD_CREDENTIAL_ID=$1  # .metadata.name of the cloud credential
  KUBECONFIG_FILE=$2      # path to the downloaded kubeconfig file

  kubeconfig="$(base64 -w 0 "${KUBECONFIG_FILE}")"

  patch_file=$(mktemp)

  cat > ${patch_file} <<EOF
  data:
    harvestercredentialConfig-kubeconfigContent: $kubeconfig
  EOF

  kubectl patch secret ${CLOUD_CREDENTIAL_ID} -n cattle-global-data --patch-file ${patch_file} --type merge
  rm ${patch_file}
  ```

  :::info important
  macOS users must use `gbase64` to ensure that the `-w` flag is supported.
  :::

## Expiration of kubeconfig Tokens in Rancher 2.9.3

From Rancher 2.9.3 the Rancher Management UI will warn when a Harvester cloud credential, or cluster connected to one, contains an expired token. Users will be given the option to `Renew` the token via the cloud credential / cluster menu

![cc-renew](./imgs/cc-renew.png)

:::note
On upgrade existing expired Harvester cloud credentials will not contain a warning. Users can though still `Renew` their token via the resource's menu.
:::