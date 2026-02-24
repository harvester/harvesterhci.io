---
title: 'Upstream Ingress-Nginx CVEs - CVE-2025-15566, CVE-2026-1580, CVE-2026-24512, CVE-2026-24513, and CVE-2026-24514'
description: 'This article provides information on the CVE-2025-15566, CVE-2026-1580, CVE-2026-24512, CVE-2026-24513, and CVE-2026-24514 vulnerabilities in Harvester.'
authors:
  - name: Ivan Sim
    title: Principal Software Engineer
    url: https://github.com/ihcsim
    image_url: https://github.com/ihcsim.png
tags: [security, cve]
hide_table_of_contents: false
---

This article provides information and mitigation steps for the following vulnerabilities in Harvester:

* [CVE-2025-15566](https://github.com/kubernetes/kubernetes/issues/136789)
* [CVE-2026-1580](https://github.com/kubernetes/kubernetes/issues/136677)
* [CVE-2026-24512](https://github.com/kubernetes/kubernetes/issues/136678)
* [CVE-2026-24513](https://github.com/kubernetes/kubernetes/issues/136679)
* [CVE-2026-24514](https://github.com/kubernetes/kubernetes/issues/136680)

:::info important

These vulnerabilities affect specific versions of the RKE2 ingress-nginx controller (v1.13.7 and earlier, v1.14.3 and earlier). All Harvester versions that use this controller (including 1.5.2 and earlier, 1.6.1 and earlier, and 1.7.0) are therefore affected.

**These CVEs are fixed in Harvester 1.7.1 and newer.**

:::

:::info important

Harvester does not utilize the ingress-nginx controller custom error backend. Therefore, it is not affected by [CVE-2026-24513](https://github.com/kubernetes/kubernetes/issues/136679).

:::

:::info important

Currently, no mitigation is available for [CVE-2026-24514](https://github.com/kubernetes/kubernetes/issues/136680). An upgrade to Harvester 1.7.1 is required.

For more information on its CVSS score, see <https://www.first.org/cvss/calculator/3.1#CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H>

:::

You can confirm the version of the RKE2 ingress-nginx pods by running this command on your Harvester cluster:

```sh
kubectl -n kube-system get po -l"app.kubernetes.io/name=rke2-ingress-nginx" -ojsonpath='{.items[].spec.containers[].image}'
```

If the command returns one of the affected versions, perform one of the following mitigation steps.

The primary resolution is to upgrade to Harvester 1.7.1 or newer, which includes the fixed RKE2 ingress-nginx controller.

If upgrade is not possible, deploy the following validating admission policy to your cluster to reject ingress resources with the vulnerable configuration:

```sh
cat<<EOF | kubectl apply -f -
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: ingress-nginx-annotation-validation
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   ["networking.k8s.io"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["ingresses"]
  validations:
    - expression: |
        !('nginx.ingress.kubernetes.io/auth-proxy-set-headers' in object.metadata.annotations) &&
        !('nginx.ingress.kubernetes.io/auth-method' in object.metadata.annotations) &&
        (object.spec.rules.all(rule, rule.http.paths.all(path, path.pathType != 'ImplementationSpecific')))
      message: "Ingress resources with the vulnerable annotations are not allowed. Please remove the 'nginx.ingress.kubernetes.io/auth-proxy-set-headers' and 'nginx.ingress.kubernetes.io/auth-method' annotations, and avoid using the 'ImplementationSpecific' path type."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: ingress-nginx-annotation-validation
spec:
  policyName: ingress-nginx-annotation-validation
  validationActions: [Deny]
EOF
```

:::info

This policy is a cluster-scoped resource that requires the proper administrator RBAC permissions to create.

:::

This validating policy rejects any ingress resources that contain the:

* `nginx.ingress.kubernetes.io/auth-proxy-set-headers` annotation
* `nginx.ingress.kubernetes.io/auth-method` annotation
* `ImplementationSpecific` path type

The policy can be removed once you upgrade to Harvester 1.7.1 or newer:

```sh
kubectl delete validatingadmissionpolicy ingress-nginx-annotation-validation

kubectl delete validatingadmissionpolicybinding ingress-nginx-annotation-validation
```

## References

* <https://github.com/kubernetes/kubernetes/issues/136789>
* <https://github.com/kubernetes/kubernetes/issues/136677>
* <https://github.com/kubernetes/kubernetes/issues/136678>
* <https://github.com/kubernetes/kubernetes/issues/136679>
* <https://github.com/kubernetes/kubernetes/issues/136680>
* <https://support.scc.suse.com/s/kb/Upstream-Ingress-Nginx-CVEs-CVE-2025-15566-CVE-2026-1580-CVE-2026-24512-CVE-2026-24513-and-CVE-2026-24514>
