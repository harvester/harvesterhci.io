---
title: 'NGINX HTTP/2 Remote Code Execution - CVE-2026-123633 and CVE-2026-123007'
description: 'This article provides information on the CVE-2026-123633 and CVE-2026-123007 vulnerabilities in Harvester.'
authors:
  - name: Ivan Sim
    title: Principal Software Engineer
    url: https://github.com/ihcsim
    image_url: https://github.com/ihcsim.png
tags: [security, cve]
hide_table_of_contents: false
---

This article provides information and mitigation steps for the following
vulnerabilities in Harvester:

* CVE-2026-123633
* CVE-2026-123007

:::info important

On November 18, 2026, two critical vulnerabilities (CVSS 4.0 score 9.2) in the
HTTP/2 implementation of NGINX were reported. Both can allow an unauthenticated
remote attacker to execute code on the NGINX server. Exploitation requires HTTP/2
to be enabled.

All supported versions of Harvester are affected, including 1.9.1 and earlier,
and 1.8.2 and earlier.

The fix will be included in upcoming Harvester releases. Meanwhile, review the
guidance in this article for mitigation.

:::

## Impact on Harvester

### Harvester 1.9 and newer

The only NGINX instance in Harvester runs in the `harvester-cluster-repo`
deployment in the `cattle-system` namespace. By default, this NGINX instance is
**not** configured to serve HTTP/2, so a default Harvester installation is not
exploitable through these vulnerabilities.

In addition, the container is secure by default: it runs as a non-root user and
doesn't use any privileged security context configuration.

To confirm that HTTP/2 is not enabled, check that the NGINX configuration files
don't contain any `http2` setting:

```sh
kubectl -n cattle-system exec deploy/harvester-cluster-repo -- grep -rn http2 /etc/nginx/nginx.conf /etc/nginx/conf.d
```

If the command returns no output (and exits with code 1), HTTP/2 is not enabled.

### Harvester 1.8.2, 1.7.3 and earlier

In addition to the `harvester-cluster-repo` deployment described above, the
`rke2-ingress-nginx-controller` daemonset in the `kube-system` namespace is also
affected. This ingress controller serves HTTP/2 by default.

To mitigate the vulnerabilities, disable HTTP/2 by setting `use-http2: "false"`
in the `kube-system/rke2-ingress-nginx` `HelmChartConfig` resource.

Use `kubectl -n kube-system edit helmchartconfig rke2-ingress-nginx` to add
`use-http2: "false"` under `controller.config` in the `.spec.valuesContent`
field:

```yaml
spec:
  valuesContent: |-
    controller:
      config:
        use-http2: "false"
```

:::info important

Do not override any existing configuration the `controller.config` section.

:::

Save and close the editor.

Harvester automatically applies the change once the content is saved.

:::note

When HTTP/2 is disabled, browsers and API clients automatically fall back to
HTTP/1.1. No client-side changes are required.

:::

To confirm that HTTP/2 is disabled, check the `rke2-ingress-nginx-controller`
config map found in the `kube-system` namespace:

```sh
kubectl -n kube-system get configmap rke2-ingress-nginx-controller -o jsonpath='{.data.use-http2}'
```

The command must return `false`.

:::note

Upgrading to Harvester 1.9 automatically removes this configuration as
the ingress-nginx DaemonSet is replaced by Traefik.

:::

The upstream fix, <https://github.com/rancher/ingress-nginx/pull/246>, will be
included in the upcoming Harvester v1.8 release. Keep HTTP/2 disabled until you
upgrade to a fixed version.

## Recommendations

Restrict permission to modify NGINX and its configuration, as well as
interactive container access.

As a cluster administrator:

* Restrict who can run `kubectl exec` (the `pods/exec` subresource) in the
`cattle-system` and `kube-system` namespaces.
* Do not modify the NGINX configuration of the `harvester-cluster-repo` deployment
to enable HTTP/2.
* For Harvester 1.8.2 and earlier, restrict who can modify the
`rke2-ingress-nginx` `HelmChartConfig`, and the `rke2-ingress-nginx-controller`
daemonset and config map.
* Don't add other NGINX instances with HTTP/2 enabled to your cluster before they
are upgraded to a fixed NGINX release.

## References

* <https://www.wiz.io/blog/nginx-http2-rce-vulnerabilities>
