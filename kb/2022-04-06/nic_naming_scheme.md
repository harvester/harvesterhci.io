---
title: NIC Naming Scheme
descripion: NIC Naming Scheme Change
slug: nic-naming-scheme
authors:
  - name: Date Huang
    title: Software Engineer
    url: https://github.com/tjjh89017
    image_url: https://github.com/tjjh89017.png
tags: [network]
hide_table_of_contents: false
---

# NIC Naming Scheme

## NIC Naming Scheme changed after upgrading to v1.0.1

`systemd` in OpenSUSE Leap 15.3 which is the base OS of Harvester is upgraded to `246.16-150300.7.39.1`. In this version, `systemd` will enable additional naming scheme `sle15-sp3` which is `v238` with `bridge_no_slot`. When there is a PCI bridge associated with NIC, `systemd` will never generate `ID_NET_NAME_SLOT` and naming policy in `/usr/lib/systemd/network/99-default.link` will fallback to `ID_NET_NAME_PATH`. According to this change, NIC names might be changed in your Harvester nodes during the upgrade process from `v1.0.0` to `v1.0.1-rc1` or above, and it will cause network issues that are associated with NIC names.

## Effect Settings and Workaround

### Startup Network Configuration

NIC name changes will need to update the name in `/oem/99_custom.yaml`. You could use [migration script](https://github.com/harvester/upgrade-helpers/blob/main/hack/udev_v238_sle15-sp3.py) to change the NIC names which are associated with a PCI bridge.

:::tip
You could find an identical machine to test naming changes before applying the configuration to production machines
:::

You could simply execute the script with root account in `v1.0.0` via
```bash
# python3 udev_v238_sle15-sp3.py
```

It will output the patched configuration to the screen and you could compare it to the original one to ensure there is no exception. (e.g. We could use `vimdiff` to check the configuration)
```bash
# python3 udev_v238_sle15-spe3.py > /oem/test
# vimdiff /oem/test /oem/99_custom.yaml
```

After checking the result, we could execute the script with `--really-want-to-do` to override the configuration. It will also back up the original configuration file with a timestamp before patching it.
```bash
# python3 udev_v238_sle15-sp3.py --really-want-to-do
```

### Harvester VLAN Network Configuration

If your VLAN network is associated with NIC name directly without `bonding`, you will need to migrate `ClusterNetwork` and `NodeNetwork` with the previous section together.

:::note
If your VLAN network is associated with the `bonding` name in `/oem/99_custom.yaml`, you could skip this section.
:::

#### Modify ClusterNetworks

You need to modify `ClusterNetworks` via 
```bash
$ kubectl edit clusternetworks vlan
```
search this pattern
```yaml
config:
  defaultPhysicalNIC: <Your NIC name>
```
and change to new NIC name

#### Modify NodeNetworks

You need to modify `NodeNetworks` via
```bash
$ kubectl edit nodenetworks <Node name>-vlan
```
search this pattern
```yaml
spec:
  nic: <Your NIC name>
```
and change to new NIC name
