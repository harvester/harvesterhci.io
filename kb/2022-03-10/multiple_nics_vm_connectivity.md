---
title: Multiple NICs VM Connectivity
descripion: How to deal VMs with multiple NICs in Harvester
slug: multiple-nics-vm-connectivity
authors:
  - name: Date Huang
    title: Software Engineer
    url: https://github.com/tjjh89017
    image_url: https://github.com/tjjh89017.png
tags: [vm, network]
hide_table_of_contents: false
---

# Multiple NICs VM Connectivity

## What is the default behavior of a VM with multiple NICs

In [some scenarios](https://github.com/harvester/harvester/issues/1059), you'll setup two or more NICs in your VM to serve different networking purposes. If all networks are setup by default with DHCP, you might get random connectivity issues. And while it might get fixed after rebooting the VM, it still will lose connection randomly after some period.

## How-to identify connectivity issues

In a Linux VM, you can use commands from the `iproute2` package to identify the default route.

In your VM, execute the following command:
```bash
ip route show default
```
:::tip
If you get the `access denied` error, please run the command using `sudo`
:::
    
The output of this command will only show the default route with the gateway and VM IP of the primary network interface (`eth0` in the example below).
```
default via <Gateway IP> dev eth0 proto dhcp src <VM IP> metric 100
```

Here is the full example:
```
$ ip route show default
default via 192.168.0.254 dev eth0 proto dhcp src 192.168.0.100 metric 100
```

However, if the issue covered in this KB occurs, you'll only be able to connect to the VM via the VNC or serial console.

Once connected, you can run again the same command as before:
```bash
$ ip route show default
```

However, this time you'll get a default route with an incorrect gateway IP.
For example:
```
default via <Incorrect Gateway IP> dev eth0 proto dhcp src <VM's IP> metric 100
```

## Why do connectivity issues occur randomly

In a standard setup, cloud-based VMs typically use DHCP for their NICs configuration. It will set an IP and a gateway for each NIC. Lastly, a default route to the gateway IP will also be added, so you can use its IP to connect to the VM.

However, Linux distributions start multiple DHCP clients at the same time and do not have a **priority** system. This means that if you have two or more NICs configured with DHCP, the client will enter a **race condition** to configure the default route. And depending on the currently running Linux distribution DHCP script, there is no guarantee which default route will be configured.

As the default route might change in every DHCP renewing process or after every OS reboot, this will create network connectivity issues.

## How to avoid the random connectivity issues

You can easily avoid these connectivity issues by having only one NIC attached to the VM and having only one IP and one gateway configured.

However, for VMs in more complex infrastructures, it is often not possible to use just one NIC. For example, if your infrastructure has a storage network and a service network. For security reasons, the storage network will be isolated from the service network and have a separate subnet. In this case, you must have two NICs to connect to both the service and storage networks.

You can choose a solution below that meets your requirements and security policy.

### Disable DHCP on secondary NIC

As mentioned above, the problem is caused by a `race condition` between two DHCP clients. One solution to avoid this problem is to disable DHCP for all NICs and configure them with static IPs only. Likewise, you can configure the secondary NIC with a static IP and keep the primary NIC enabled with DHCP.

1. To configure the primary NIC with a static IP (`eth0` in this example), you can edit the file `/etc/sysconfig/network/ifcfg-eth0` with the following values:

```
BOOTPROTO='static'
IPADDR='192.168.0.100'
NETMASK='255.255.255.0'
```

Alternatively, if you want to reserve the primary NIC using DHCP (`eth0` in this example), use the following values instead:

```
BOOTPROTO='dhcp'
DHCLIENT_SET_DEFAULT_ROUTE='yes'
```


2. You need to configure the default route by editing the file `/etc/sysconfig/network/ifroute-eth0` (if you configured the primary NIC using DHCP, skip this step):


```
# Destination  Dummy/Gateway  Netmask  Interface
default        192.168.0.254  -        eth0
```

:::caution
Do not put other default route for your secondary NIC
:::
    
3. Finally, configure a static IP for the secondary NIC by editing the file `/etc/sysconfig/network/ifcfg-eth1`:

```
BOOTPROTO='static'
IPADDR='10.0.0.100'
NETMASK='255.255.255.0'
```

#### Cloud-Init config

```yaml
network:
  version: 1
  config:
    - type: physical
      name: eth0
      subnets:
        - type: dhcp
    - type: physical
      name: eth1
      subnets:
        - type: static
          address: 10.0.0.100/24
```
   
### Disable secondary NIC default route from DHCP

If your secondary NIC requires to get its IP from DHCP, you'll need to disable the secondary NIC default route configuration.

1. Confirm that the primary NIC configures its default route in the file `/etc/sysconfig/network/ifcfg-eth0`:

```
BOOTPROTO='dhcp'
DHCLIENT_SET_DEFAULT_ROUTE='yes'
```

2. Disable the secondary NIC default route configuration by editing the file `/etc/sysconfig/network/ifcfg-eth1`:

```
BOOTPROTO='dhcp'
DHCLIENT_SET_DEFAULT_ROUTE='no'
```

#### Cloud-Init config

This solution is not available in Cloud-Init. Cloud-Init didn't allow any option for DHCP.
