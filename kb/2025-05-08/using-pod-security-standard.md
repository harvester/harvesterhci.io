---
title: 'Using Pod Security Standards (PSS) in Harvester To Enforce Secure Workload Isolation'
description: 'This article describes how to use Pod Security Standards (PSS) in Harvester.'
authors:
  - name: Gaurav Mehta
    title: Principal Software Engineer
    url: https://github.com/ibrokethecloud
tags: [security]
hide_table_of_contents: false
---

Users wishing to prevent privilege escalation and other security issues can leverage Kubernetes' [Pod Security Standards (PSS)](https://kubernetes.io/docs/concepts/security/pod-security-standards/) on Harvester. PSS are a set of security policies that can be applied to clusters and namespaces to control and restrict how workloads are executed.

Pod Security Standards in Harvester can be used when provisioning VM workloads and also with the new experimental support for running [baremetal container workloads](https://docs.harvesterhci.io/v1.5/rancher/rancher-integration#harvester-baremetal-container-workload-support-experimental).

The `baseline` policy is aimed at ease of adoption for common containerized workloads while preventing known privilege escalations. This policy is targeted at application operators and developers of non-critical applications.

:::warning
VMs with device passthrough, such as `pcidevices`, `usbdevices` and `vgpudevices`, will fail to start with `baseline` policy, as they need `SYS_RESOURCE` capability. This is being tracked on issue [#8218](https://github.com/harvester/harvester/issues/8218). A fix should be available for this shortly.
:::

### Namespace level enablement

To enable PSS a user simply needs to label their workload namespaces as follows:

```
kubectl label --overwrite ns <namespace>  pod-security.kubernetes.io/enforce=baseline
```

:::note

Do not apply PSS to the system's namespaces, as they need privileged permissions to manage cluster resources. Only trusted users must have access to system's namespaces.

:::

### Cluster scoped enablement

Cluster wide PSS can be enabled by passing an Admission Control configuration via kube-apiserver arguments. This can be done via Harvester's [CloudInit](https://docs.harvesterhci.io/v1.5/advanced/cloudinitcrd) using the following configuration which can be saved to `cloudinit-pss.yaml` file:

```
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: cluster-wide-pss-enforcement
spec:
  matchSelector:
    node-role.kubernetes.io/control-plane: "true"
  filename: 99-pss.yaml
  contents: |
    stages:
      initramfs:
        - name: "setup harvester pss"
          directories:
          - path: /etc/rancher/rke2/config
            owner: 0
            group: 0
            permissions: 384
          files:
          - content: |
              kube-apiserver-arg:
                - "admission-control-config-file=/etc/rancher/rke2/config/harvester-pss.yaml"
            path: /etc/rancher/rke2/config.yaml.d/99-harvester-pss.yaml
            permissions: 384
            owner: 0
            group: 0
          - content: |
              apiVersion: apiserver.config.k8s.io/v1
              kind: AdmissionConfiguration
              plugins:
                - name: PodSecurity
                  configuration:
                    apiVersion: pod-security.admission.config.k8s.io/v1
                    kind: PodSecurityConfiguration
                    defaults:
                      enforce: "baseline"
                      enforce-version: "latest"
                      audit: "baseline"
                      audit-version: "latest"
                      warn: "baseline"
                      warn-version: "latest"
                    exemptions:
                      usernames: []
                      runtimeClasses: []
                      namespaces: [calico-apiserver,
                                   calico-system,
                                   cattle-alerting,
                                   cattle-csp-adapter-system,
                                   cattle-elemental-system,
                                   cattle-epinio-system,
                                   cattle-externalip-system,
                                   cattle-fleet-local-system,
                                   cattle-fleet-system,
                                   cattle-gatekeeper-system,
                                   cattle-global-data,
                                   cattle-global-nt,
                                   cattle-impersonation-system,
                                   cattle-istio,
                                   cattle-istio-system,
                                   cattle-logging,
                                   cattle-logging-system,
                                   cattle-monitoring-system,
                                   cattle-neuvector-system,
                                   cattle-prometheus,
                                   cattle-provisioning-capi-system,
                                   cattle-resources-system,
                                   cattle-sriov-system,
                                   cattle-system,
                                   cattle-ui-plugin-system,
                                   cattle-windows-gmsa-system,
                                   cert-manager,
                                   cis-operator-system,
                                   fleet-default,
                                   ingress-nginx,
                                   istio-system,
                                   kube-node-lease,
                                   kube-public,
                                   kube-system,
                                   longhorn-system,
                                   rancher-alerting-drivers,
                                   security-scan,
                                   tigera-operator,
                                   harvester-system,
                                   harvester-public,
                                   rancher-vcluster]
            path: /etc/rancher/rke2/config/harvester-pss.yaml
            permissions: 384
            owner: 0
            group: 0
  paused: false
```

The cluster admin can apply this against the Harvester cluster using `kubectl apply -f cloudinit-pss.yaml`. The change requires a restart of the control plane nodes to ensure that the Elemental cloud-init directives are applied on boot. Once control plane nodes are rebooted, a default `baseline` pod security standard will be enforced against all current and subsequently created namespaces. The namespaces listed under exemptions will be skipped. Users are free to tweak the list, to better suit their use cases.

### Security considerations

:::note

For future integration of Pod Security Admission (PSA) configuration natively in Harvester, please verify the progress of issue [#8196](https://github.com/harvester/harvester/issues/8196).

:::

Post application of a default PSS, end users, with permissions to create and edit namespaces, may still be able to override the respective policy by labeling their namespaces to support `privileged` workloads, for example, as follows:

`kubectl label --overwrite ns <namespace> pod-security.kubernetes.io/enforce=privileged`

To avoid this, we recommend users to create custom RBACs restricting who can create/update namespaces or to also deploy a [Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/). The following policy will block namespace create/update requests containing a label `pod-security.kubernetes.io/enforce`, there by preventing namespace admins from changing the settings for their namespace.

```
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: namespace-pss-label-rejection
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   [""]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["namespaces"]
  validations:
  - expression: |
      !("pod-security.kubernetes.io/enforce" in object.metadata.labels)
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: namespace-pss-label-rejection-binding
spec:
  policyName: namespace-pss-label-rejection
  validationActions: [Deny]
```

In case more tailored policies are needed, users can rely on security policy engines like [Kubewarden](https://www.kubewarden.io/)'s policy [`PSA Label Enforcer`](https://artifacthub.io/packages/kubewarden/psa-label-enforcer/psa-label-enforcer), or similar solution, to ensure that namespaces have the required PSS configuration for deployment in the cluster.
