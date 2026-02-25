---
title: KubeVirt Certificates Rotation
description: KubeVirt Certificates Rotation.
slug: kubevirt_certificates_rotation
authors:
  - name: Cooper Tseng
    title: Software Engineer
    url: https://github.com/brandboat
    image_url: https://github.com/brandboat.png
tags: [harvester, kubevirt, certificates, cert, ca]
hide_table_of_contents: false
---

Harvester's embedded Rancher UI may display warnings about expiring KubeVirt certificates. You can safely ignore these warnings because automatic certificate rotation is handled by KubeVirt and is enabled by default.

![kubevirt-certs-expired](./imgs/kubevirt_certs_expired.png)

## KubeVirt Certificate Rotation Strategy
KubeVirt provides a self-signed certificate mechanism that rotates both CA and certifcates on a defined recurring interval. You can check the setting  `certificateRotateStrategy` by running the following command:
```sh
kubectl get kubevirt -n harvester-system -o yaml
```
By default, the value of `certificateRotateStrategy` is empty, which means that KubeVirt uses its default rotation settings and no manual configuration is required.
```yaml
certificateRotateStrategy: {}
```

## Configuration Fields

You can use the following fields to configure `certificateRotateStrategy`.
- `.ca.duration`: Validity period of the CA certificate. The default value is "168h".
- `.ca.renewBefore`: Amount of time before a CA certificate expires during which a new certificate is issued. The default value is "33.6h".
- `.server.duration`: Validity period of server component certificates (for example, virt-api, virt-handler, and virt-operator). The default value is "24h".
- `.server.renewBefore`: Amount of time before a server certificate expires during which a new certificate is issued. The default value is "4.8h".

Example of a complete configuration:
```yaml
certificateRotateStrategy:
  selfSigned:
    ca:
      duration: 168h
      renewBefore: 33.6h
    server:
      duration: 24h
      renewBefore: 4.8h
```

## Certificate Rotation Triggers

Certificate rotation can be triggered by several conditions. The following list only outlines key triggers and is not exhaustive.
- Missing certificate: A required certificate does not exist.
- Invalid CA signature: A certificate was not signed by the specified CA.
- Proactive renewal: The `renewBefore` value takes effect. A new certificate must be issued before the current one expires.
- CA expiration: The CA certificate has expired, so the certificate signed by the CA is also rotated.

When certificate rotation is triggered, you should see `virt-operator` log records similar to the following:
```txt
{"component":"virt-operator","level":"info","msg":"secret kubevirt-virt-api-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.045809Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-controller-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.056759Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-exportproxy-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.063530Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-virt-handler-server-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.068608Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-virt-handler-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.074555Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-operator-certs updated","pos":"core.go:278","timestamp":"2024-12-06T08:02:01.078719Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-export-ca updated","pos":"core.go:278","timestamp":"2024-12-06T08:03:36.063496Z"}
{"component":"virt-operator","level":"info","msg":"secret kubevirt-ca updated","pos":"core.go:278","timestamp":"2024-12-06T08:04:06.052750Z"}
```

## References

- Harvester: [Issue 5798](https://github.com/harvester/harvester/issues/5798)
- https://kubevirt.io/2020/KubeVirt-Security-Fundamentals.html
- https://github.com/kubevirt/kubevirt/blob/v1.1.1/pkg/virt-operator/resource/generate/components/secrets.go#L326
- https://github.com/kubevirt/kubevirt/blob/v1.1.1/pkg/virt-operator/resource/apply/certificates.go