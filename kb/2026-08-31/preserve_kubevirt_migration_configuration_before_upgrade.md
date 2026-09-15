---
title: Preserving a manually configured KubeVirt live migration configuration
description: How to keep a live migration configuration that was applied directly to the kubevirt object when upgrading to Harvester v1.7.0 or later, which introduced the kubevirt-migration setting.
slug: preserve_kubevirt_migration_configuration_before_upgrade
authors:
  - name: Samuel Vasconcelos
    title: Software Engineer
    url: https://github.com/susesamu
    image_url: https://github.com/susesamu.png
tags: [harvester, upgrade, live migration, kubevirt, settings]
hide_table_of_contents: false
---

Harvester v1.7.0 introduced the [`kubevirt-migration`](https://docs.harvesterhci.io/v1.7/advanced/index#kubevirt-migration) setting, which exposes the cluster-wide live migration configuration that previously could only be changed by editing the `kubevirt` object directly.

If you customized `spec.configuration.migrations` on the `kubevirt` object before upgrading, that customization is at risk. This article explains why and provides a script that converts it into the setting so it is preserved.

## Who is affected

You are affected if **both** of the following are true:

- You are running a version earlier than v1.7.0 and you changed `spec.configuration.migrations` on the `kubevirt` object, for example to enable `allowAutoConverge`.
- You plan to upgrade to v1.7.0 or later.

You are also affected if you have **already** upgraded to v1.7.x and have not yet changed the `kubevirt-migration` setting. In that case the configuration is still intact and the same script applies.

Check whether the `kubevirt` object carries a configuration:

```bash
kubectl get kubevirt kubevirt -n harvester-system -o jsonpath='{.spec.configuration.migrations}' | jq
```

If the command returns nothing, your cluster uses the KubeVirt defaults and no action is required.

## What happens without this procedure

The upgrade creates the `kubevirt-migration` setting without a value, so the Harvester UI displays the default values. The `kubevirt` object keeps your configuration, so live migration continues to behave as before.

The two are now inconsistent, and the inconsistency is not visible unless you compare them. Harvester writes the whole value of the setting to the `kubevirt` object, so the first time the setting is saved, all fields are written at once, including the fields that you did not change. Your configuration is replaced by the defaults, without warning.

In practice this means that changing an unrelated field such as `parallelMigrationsPerCluster` in the UI silently turns `allowAutoConverge` back off. Migrations of write-heavy virtual machines then start failing to converge, which is often noticed only during the node drains of a later upgrade.

## Procedure

Run the following script from a machine with `kubectl` access to the cluster. `jq` is required.

Run it **before** you upgrade to v1.7.0 or later. If you already upgraded to v1.7.x and have not yet changed the setting, run it now.

```bash
#!/bin/bash
set -euo pipefail

SETTING_NAME="kubevirt-migration"

migrations=$(kubectl get kubevirt kubevirt -n harvester-system -o json | jq -c '.spec.configuration.migrations // empty')
if [ -z "$migrations" ]; then
  echo "The kubevirt object has no migration configuration. Nothing to preserve."
  exit 0
fi

# nodeDrainTaintKey and network cannot be configured through the setting:
# nodeDrainTaintKey is used by the upgrade process, and network is owned by
# the vm-migration-network setting. The webhook rejects a value containing them.
value=$(echo "$migrations" | jq -c 'del(.nodeDrainTaintKey, .network)')
if [ "$value" = "{}" ]; then
  echo "The migration configuration only contains fields that the setting does not manage. Nothing to preserve."
  exit 0
fi

if setting_json=$(kubectl get settings.harvesterhci.io "$SETTING_NAME" -o json 2>/dev/null); then
  current_value=$(echo "$setting_json" | jq -r '.value // empty')
  if [ -n "$current_value" ]; then
    echo "The $SETTING_NAME setting already has a value. Nothing to do."
    exit 0
  fi

  echo "Setting $SETTING_NAME to: $value"
  kubectl patch settings.harvesterhci.io "$SETTING_NAME" --type merge \
    -p "$(jq -n --arg v "$value" '{"value": $v}')"
else
  echo "Creating $SETTING_NAME with: $value"
  kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: Setting
metadata:
  name: $SETTING_NAME
value: '$value'
EOF
fi

echo "Result:"
kubectl get settings.harvesterhci.io "$SETTING_NAME" -o yaml
```

The script does not write to the `kubevirt` object, so it cannot change how the cluster performs live migrations. It is idempotent: it does nothing if there is no configuration to preserve, or if the setting already has a value.

:::note

The Harvester webhook rejects changes to the `kubevirt-migration` setting while a virtual machine migration is in progress. If the script fails for that reason, wait until all migrations are completed and run it again.

:::

## Verification

Confirm that the setting now holds your configuration:

```bash
kubectl get settings.harvesterhci.io kubevirt-migration -o jsonpath='{.value}' | jq
```

Confirm that the `kubevirt` object is unchanged:

```bash
kubectl get kubevirt kubevirt -n harvester-system -o jsonpath='{.spec.configuration.migrations}' | jq
```

After you upgrade, the two remain consistent, and the Harvester UI shows the configuration that the cluster is actually using.

## After the upgrade

The `kubevirt-migration` setting is the source of truth. Harvester writes it to the `kubevirt` object whenever the setting changes.

Do not edit `spec.configuration.migrations` on the `kubevirt` object directly. Any change is overwritten the next time the setting is reconciled. Use the setting instead, either in the Harvester UI under **Advanced** > **Settings**, or with `kubectl`.

For the list of supported fields and their defaults, see [`kubevirt-migration`](https://docs.harvesterhci.io/v1.7/advanced/index#kubevirt-migration) in the Harvester documentation.

For background on the individual options and on per-virtual-machine migration policies, see [VM Live Migration Policy and Configuration](https://harvesterhci.io/kb/vm_live_migration_policy_and_configuration).
