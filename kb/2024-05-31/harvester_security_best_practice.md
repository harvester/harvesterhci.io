---
title: Best Practices for Harvester Security
description: A set of best practices for Harvester security.
slug: harvester_security_best_practices
authors:
  - name: Jian Wang
    title: Staff Software Engineer
    url: https://github.com/w13915984028
    image_url: https://github.com/w13915984028.png
tags: [harvester, security, credential]
hide_table_of_contents: false
---

## User-Provided Credentials on Harvester

When [installing a Harvester cluster](https://docs.harvesterhci.io/v1.2/install/index#installation-steps), you are asked to provide the following credential related information:

- Cluster token of the first node that is added to the cluster. Other nodes must use this token to join the cluster.

- Password for the default Linux user `rancher` on each node.

- SSH keys on each node (optional).

- HTTP proxy on each node (optional).

You may plan to change them from time to time, the following paragraphs describe the detailed steps.

### Cluster Token

#### Cluster Token on Nodes Joining an Existing Cluster

When a node is unable to join a cluster because of a cluster token error, perform the recommended [troubleshooting steps](https://docs.harvesterhci.io/v1.2/troubleshooting/index/#modifying-cluster-token-on-agent-nodes).

#### Cluster Token (RKE2 Token Rotation)

Harvester does not allow you to change the cluster token even if RKE2 is a core component of Harvester.

The [RKE2 documentation](https://docs.rke2.io/security/token#server-token-rotation) states that the November 2023 releases of RKE2 (v1.28.3+rke2r2, v1.27.7+rke2r2, v1.26.10+rke2r2, and v1.25.15+rke2r2) allow you to rotate the cluster token using the command `rke2 token rotate --token original --new-token new`. 

During testing, the command was run on the first node of a cluster running **Harvester v1.3.0 with RKE2 v1.27.10+rke2r1**.

1. Rotate the token on initial node.

```
/opt/rke2/bin $ ./rke2 token rotate --token rancher --new-token rancher1

WARNING: Recommended to keep a record of the old token. If restoring from a snapshot, you must use the token associated with that snapshot.
WARN[0000] Cluster CA certificate is not trusted by the host CA bundle, but the token does not include a CA hash. Use the full token from the server's node-token file to enable Cluster CA validation. 
Token rotated, restart rke2 nodes with new token
```

2. When the first cluster node was rebooted, RKE2 service was unable to start.

```
RKE2 log:

...
May 29 15:45:11 harv41 rke2[3293]: time="2024-05-29T15:45:11Z" level=info msg="etcd temporary data store connection OK"
May 29 15:45:11 harv41 rke2[3293]: time="2024-05-29T15:45:11Z" level=info msg="Reconciling bootstrap data between datastore and disk"
May 29 15:45:11 harv41 rke2[3293]: time="2024-05-29T15:45:11Z" level=fatal msg="Failed to reconcile with temporary etcd: bootstrap data already found and encrypted with different token"
May 29 15:45:11 harv41 systemd[1]: rke2-server.service: Main process exited, code=exited, status=1/FAILURE
...
```

This known issue was logged on Github issue [rke2 token rotate does not work as expected (v1.27.10+rke2r1)](https://github.com/rancher/rke2/issues/6250).

:::Warning

Do not attempt to rotate the RKE2 token on your cluster before Harvester announces official support for this feature (even if the embedded RKE2 binary has the `token rotate` option).

:::

### Password of the Default User `rancher`

This process is node-specific. You must change the [password of the default user](https://docs.harvesterhci.io/v1.2/install/update-harvester-configuration/#password-of-user-rancher) on each node even if the same password is used on all Harvester nodes.

### SSH keys

You must log into a Harvester node using the default user account `rancher` to change the [SSH keys](https://docs.harvesterhci.io/v1.2/install/update-harvester-configuration#ssh-keys-of-user-rancher).

### HTTP Proxy

After a Harvester cluster is installed, you can use the Harvester UI to change the [HTTP proxy](https://docs.harvesterhci.io/v1.2/advanced/index#http-proxy).

Alternatively, you can use `kubectl` or the rest API against the URI `/harvesterhci.io.setting/http-proxy`.

```
$ kubectl get settings.harvesterhci.io http-proxy -oyaml

apiVersion: harvesterhci.io/v1beta1
default: '{}'
kind: Setting
metadata:
  creationTimestamp: "2024-05-13T20:44:20Z"
  generation: 1
  name: http-proxy
  resourceVersion: "5914"
  uid: 282506bb-f1dd-4247-bf0e-93640698c1f5
status: {}
```

Harvester has a webhook that checks this setting to ensure it meets all conditions, e.g. the internal IPs and CIDRs are specified in the `noProxy` field.

:::note

Avoid changing the HTTP proxy from files in the host `/oem` path for the following reasons:

- You must manually change the HTTP proxy on each node.

- Contents of local files are not automatically populated to new nodes.

- Without help from the webhook, some erroneous configurations may not be promptly detected (see [Node IP should be in noProxy](https://github.com/harvester/harvester/pull/5824)).

- Harvester may change the file naming or content structure in the future.

:::

## Other Credentials and Settings

### `auto-rotate-rke2-certs`

Harvester is built on top of Kubernetes, RKE2, and Rancher. RKE2 generates a list of `*.crt` and `*.key` files that allow Kubernetes components to function. The `*.crt` file expires after one year by default.

```
$ ls /var/lib/rancher/rke2/server/tls/ -alth

...
-rw-r--r-- 1 root root  570 May 27 08:45 server-ca.nochain.crt
-rw------- 1 root root 1.7K May 27 08:45 service.current.key
-rw-r--r-- 1 root root  574 May 27 08:45 client-ca.nochain.crt
drwxr-xr-x 2 root root 4.0K May 13 20:45 kube-controller-manager
drwxr-xr-x 2 root root 4.0K May 13 20:45 kube-scheduler
drwx------ 6 root root 4.0K May 13 20:45 .
drwx------ 8 root root 4.0K May 13 20:45 ..
-rw-r--r-- 1 root root 3.9K May 13 20:40 dynamic-cert.json
drwx------ 2 root root 4.0K May 13 20:39 temporary-certs
-rw------- 1 root root 1.7K May 13 20:39 service.key
-rw-r--r-- 1 root root 1.2K May 13 20:39 client-auth-proxy.crt
-rw------- 1 root root  227 May 13 20:39 client-auth-proxy.key
-rw-r--r-- 1 root root 1.2K May 13 20:39 client-rke2-cloud-controller.crt
...
-rw-r--r-- 1 root root 1.2K May 13 20:39 client-admin.crt
-rw------- 1 root root  227 May 13 20:39 client-admin.key
...


$ openssl x509 -enddate -noout -in /var/lib/rancher/rke2/server/tls/client-admin.crt

notAfter=May 13 20:39:42 2025 GMT
```

When a cluster has been running for over one year, Kubernetes components may fail to start after upgrades or node rebooting. The [workaround](https://github.com/harvester/harvester/issues/3863#issuecomment-1539681311) is to delete the related files and restart the pod.

Harvester v1.3.0 added the setting [`auto-rotate-rke2-certs`](https://docs.harvesterhci.io/v1.3/advanced/index#auto-rotate-rke2-certs), which allows you to set the Harvester cluster to automatically rotate certificates for RKE2 services. When you enable the setting and specify a certificate validity period, Harvester automatically replaces the certificate before the specified period ends.

:::note

Enabling this setting on your cluster is highly recommended.

:::

### Harvester Cloud Credentials

See the article [Renew Harvester Cloud Credentials](https://harvesterhci.io/kb/renew_harvester_cloud_credentials).

### `additional-ca`

See the [documentation](https://docs.harvesterhci.io/v1.2/advanced/index#additional-ca) for this setting.

### `ssl-certificates`

See the [documentation](https://docs.harvesterhci.io/v1.2/advanced/index#ssl-certificates) for this setting.

### `ssl-parameters`

See the [documentation](https://docs.harvesterhci.io/v1.2/advanced/index#ssl-parameters) for this setting.

### `containerd-registry`

See the [documentation](https://docs.harvesterhci.io/v1.2/advanced/index#containerd-registry) for this setting.
