---
title: "eMudhra intermediate CA compromise: Harvester nodes trust the affected roots"
description: This article explains how the eMudhra intermediate CA compromise affects Harvester and provides a temporary workaround.
slug: emudhra-ca-compromise
authors:
  - name: Julien Niedergang
    title: Customer Success Manager
    url: https://github.com/jniedergang
    image_url: https://github.com/jniedergang.png
tags: [security]
hide_table_of_contents: false
---

In October 2026, the private keys of eight eMudhra intermediate certificate authorities were found to be recoverable from their public certificates, because of a key generation flaw. An attacker who holds one of these keys can issue a certificate for any host name and impersonate any TLS server to a client that still trusts these intermediates.

The intermediates chain to the **emSign ECC Root CA - G3** root and, through cross-signed copies, to the **AAA Certificate Services** root (labeled `Comodo AAA Services root` in the trust store). Browsers blocked them between October 17 and 20, 2026, and Mozilla removed the emSign ECC Root CA - G3 root from NSS 3.131.1. Non-browser clients generally do not check revocation and need an updated trust store.

## Affected Versions

The following is the list of affected versions:

* Harvester 1.9.0
* Harvester 1.8.2 and earlier
* Harvester 1.7.3 and earlier
* Harvester 1.6.1 and earlier

Harvester nodes ship the Mozilla trust store from the `ca-certificates-mozilla` package. Versions 1.8.2 and 1.9.0 include `ca-certificates-mozilla-2.84`, which still trusts both roots. Earlier versions ship older bundles that include the same roots.

The trust store is used by the TLS clients that run on the host, such as `containerd` when it pulls images, `kubelet` and RKE2. Container images carry their own trust store, so the components that run in pods are affected independently of the host.

Your node is affected if the following command, run on the node, returns a value other than `0`:

```sh
trust list --filter=ca-anchors | grep -cE "label: (emSign ECC Root CA - G3|Comodo AAA Services root)$"
```

If the node has Internet access, a successful `curl https://dv-g3b-emudhra.we-have-a-problem.com/` also shows that the node is affected.

## Fixed Versions

A fix is not yet available. SUSE is working on an updated `ca-certificates-mozilla` package, which a later Harvester release will include along with rebuilt container images.

Meanwhile, you can use the following workaround to remove the trust in both roots on the Harvester nodes.

## Workaround

Use a [CloudInit resource](https://docs.harvesterhci.io/v1.9/advanced/cloudinitcrd) to move the compromised trust to the system blocklist. This workaround does not require network access and is suitable for air-gapped clusters.

Apply the following resource to your Harvester cluster:

```yaml
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: emudhra-blocklist
spec:
  matchSelector: {}
  filename: 99_emudhra-blocklist.yaml
  contents: |
    stages:
      boot:
        - name: "Distrust the eMudhra compromised roots"
          commands:
            - |
              d=/etc/pki/trust/blocklist; [ -d $d ] || d=/etc/pki/trust/blacklist
              trust extract --format=pem-bundle --filter='pkcs11:object=Comodo%20AAA%20Services%20root;type=cert' $d/Comodo_AAA_Services_root.pem
              trust extract --format=pem-bundle --filter='pkcs11:object=emSign%20ECC%20Root%20CA%20-%20G3;type=cert' $d/emSign_ECC_Root_CA_-_G3.pem
              update-ca-certificates
```

:::info

This configuration is a cluster-scoped resource that requires the proper administrator RBAC permissions to create.

:::

The resource is written to `/oem/99_emudhra-blocklist.yaml` on every node, including nodes that join the cluster later. It takes effect at the next reboot: the `boot` stage runs before RKE2, `containerd` and `kubelet` start, so these services load the updated trust store. Running services keep the roots that they have already loaded, so reboot the nodes one at a time, using [maintenance mode](https://docs.harvesterhci.io/v1.9/host/#node-maintenance).

After the workaround is applied, the check command in [Affected Versions](#affected-versions) returns `0`.

This workaround only covers the clients that use the host OS trust store. If your cluster runs virtual machines or pods with independent trust stores, you must update them following their base OS instructions.

:::note
Once you have upgraded to a fixed version of Harvester, remove the resource and reboot the nodes:

```sh
kubectl delete cloudinit emudhra-blocklist
```
:::

## References

- https://emudhra.we-have-a-problem.com/
- https://bugzilla.mozilla.org/show_bug.cgi?id=2083449
- https://blog.mozilla.org/security/2026/10/20/protecting-firefox-users-following-the-compromise-of-emudhra-intermediate-certificates/
- https://www.suse.com/security/cve/CVE-2026-111943.html
