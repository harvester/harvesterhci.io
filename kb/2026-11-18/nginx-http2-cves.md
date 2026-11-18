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

The fix will be included in Harvester v1.10. Meanwhile, review the guidance in
this article.

:::

## Impact on Harvester

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

## Recommendations

To exploit these vulnerabilities, an attacker needs to enable HTTP/2 in the NGINX
configuration, which requires shell access to the `harvester-cluster-repo`
container. As a cluster administrator:

* Restrict who can run `kubectl exec` (the `pods/exec` subresource) in the
`cattle-system` namespace.
* Do not modify the NGINX configuration of the `harvester-cluster-repo` deployment
to enable HTTP/2.
* Don't add other NGINX instances with HTTP/2 enabled to your cluster before they
are upgraded to a fixed NGINX release.

## References

* <https://www.wiz.io/blog/nginx-http2-rce-vulnerabilities>
