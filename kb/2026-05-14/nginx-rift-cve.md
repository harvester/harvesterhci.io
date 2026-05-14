---
title: 'Upstream Ingress-Nginx CVEs - CVE-2026-42945, CVE-2026-42946, CVE-2026-40701, CVE-2026-42934'
description: 'This article provides information on the  CVE-2026-42945, CVE-2026-42946, CVE-2026-40701 and CVE-2026-42934 vulnerabilities in Harvester.'
authors:
  - name: Ivan Sim
    title: Principal Software Engineer
    url: https://github.com/ihcsim
    image_url: https://github.com/ihcsim.png
tags: [security, cve]
hide_table_of_contents: false
---

This article provides information and mitigation steps for the following vulnerabilities in Harvester:

* [CVE-2026-42945](https://www.suse.com/security/cve/CVE-2026-42945.html)
* [CVE-2026-42946](https://www.suse.com/security/cve/CVE-2026-42946.html)
* [CVE-2026-40701](https://www.suse.com/security/cve/CVE-2026-40701.html)
* [CVE-2026-42934](https://www.suse.com/security/cve/CVE-2026-42934.html)

:::info important

These vulnerabilities affect RKE2 ingress-nginx controller v1.14.5 and earlier. All Harvester versions that use this controller (including 1.5.2 and earlier, 1.6.1 and earlier, 1.7.0 and earlier, and 1.8.0) are therefore affected.

**2026-05-15: Until Harvester 1.7.2 and 1.8.1 are released with the fixes, apply the mitigation steps below to secure your clusters.**

:::

You can confirm the version of the RKE2 ingress-nginx pods by running this command on your Harvester cluster:

```sh
kubectl -n kube-system get po -l"app.kubernetes.io/name=rke2-ingress-nginx" -ojsonpath='{.items[].spec.containers[].image}'
```

If the command returns one of the affected versions, perform the following mitigation steps.

The primary resolution is to upgrade Harvester to one of these versions:

* 1.7.2 or newer
* 1.8.1 or newer

If upgrade is not possible, apply the following mitigation to protect your clusters.

All ingress resources with the `nginx.ingress.kubernetes.io/rewrite-target` annotation containing `?` in the annotation value are at risk.

By default, Harvester does not include any ingress resources with this annotation. Run the following command on your clusters to identify affected custom ingress resources:

```sh
kubectl get ingress -A -o json | jq '.items[] | select(.metadata.annotations["nginx.ingress.kubernetes.io/rewrite-target"] // "" | contains("?")) | {namespace: .metadata.namespace, name: .metadata.name, rewrite: .metadata.annotations["nginx.ingress.kubernetes.io/rewrite-target"]}'
```

Any ingress resources reported by the above command are vulnerable. They should be updated to either remove the vulnerable annotation or change the annotation value to not contain a question mark `?`.

The following validating admission policy can be applied to your cluster to reject ingress resources with the vulnerable configuration:

```sh
cat<<EOF | kubectl apply -f -
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: ingress-nginx-annotation-validation-20260514
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
        !has(object.metadata.annotations) ||
        !object.metadata.annotations.exists(k, k == 'nginx.ingress.kubernetes.io/rewrite-target') ||
        !object.metadata.annotations['nginx.ingress.kubernetes.io/rewrite-target'].contains('?')
      message: "Ingress resources with 'nginx.ingress.kubernetes.io/rewrite-target' annotation containing '?' in the annotation value are not allowed, due to the following CVEs: CVE-2026-42945, CVE-2026-42946, CVE-2026-40701, CVE-2026-42934"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: ingress-nginx-annotation-validation-20260514
spec:
  policyName: ingress-nginx-annotation-validation-20260514
  validationActions: [Deny]
EOF
```

:::info

This policy is a cluster-scoped resource that requires the proper administrator RBAC permissions to create.

:::

:::info important

This validating policy prevents the inclusion of the vulnerable annotation configuration in new and existing ingress resources. However, it cannot detect or block any vulnerable ingress resources that already exist in the cluster. Therefore, it is important to follow the instructions described above to also identify and update any existing vulnerable ingress resources.

:::

The policy can be removed once you upgrade to Harvester 1.7.2, 1.8.1 or newer:

```sh
kubectl delete validatingadmissionpolicy ingress-nginx-annotation-validation-20260514

kubectl delete validatingadmissionpolicybinding ingress-nginx-annotation-validation-20260514
```

## References

* <https://depthfirst.com/research/nginx-rift-achieving-nginx-rce-via-an-18-year-old-vulnerability>
* <https://www.suse.com/security/cve/CVE-2026-42945.html>
* <https://www.suse.com/security/cve/CVE-2026-42946.html>
* <https://www.suse.com/security/cve/CVE-2026-40701.html>
* <https://www.suse.com/security/cve/CVE-2026-42934.html>
