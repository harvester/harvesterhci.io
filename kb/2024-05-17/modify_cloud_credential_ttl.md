---
title: Renew Harvester cloud credentials
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

## Kubeconfig token expiry in Rancher 2.8.x

Rancher 2.8.x has introduced a new [kubeconfig-default-token-ttl-minutes](https://ranchermanager.docs.rancher.com/api/api-tokens#kubeconfig-default-token-ttl-minutes) setting. As highlighted in the document the default value for this setting is 30 days.

A side effect of this issue, has been the expiry of kubeconfig tokens used by rancher in provisioning downstream clusters on Harvester.

When the cloud credential token expires, the end users cannot perform any further cluster management operations on downstream clusters on Harvester. An issue tracking the same is available [here.](https://github.com/rancher/rancher/issues/44912)

**NOTE:** This only impacts Harvester cloud credentials created after installing or upgrading to Rancher 2.8.x

## Workaround

Users can patch the expired harvester cloud credential to the use a new api token as follows:

1. Identify the expired cloud credential for the cluster
![identify-credentials](./imgs/identify-cloud-credential.png)

2. Generate a new rancher api token with "No Scope". Users can custom the ttl for their token, a custom value of 0 results in tokens that do not expire.
![api-token](./imgs/api-token.png)

3. Generate a kubeconfig to access the rancher server using the [instructions.](https://ranchermanager.docs.rancher.com/api/quickstart)

4. the cloud credential is stored as a secret in `cattle-global-data` namespace, and can be patched with new API token as follows. Please ensure that environment variable KUBECONFIG points to the generated kubeconfig

```shell
#!/bin/sh
CLOUD_CREDENTIAL_NAME=$1
API_TOKEN=$2

kubeconfig=$(kubectl get secret $CLOUD_CREDENTIAL_NAME -n cattle-global-data -o yaml |   yq '.data.harvestercredentialConfig-kubeconfigContent' | base64 -d | token=${API_TOKEN} yq -e '.users[0].user.token = env(token)' | base64 )

patch_file=$(mktemp)

cat > ${patch_file} <<EOF
data:
  harvestercredentialConfig-kubeconfigContent: $kubeconfig
EOF

kubectl patch secret ${CLOUD_CREDENTIAL_NAME} -n cattle-global-data --patch-file ${patch_file} --type merge
rm ${patch_file}
```
