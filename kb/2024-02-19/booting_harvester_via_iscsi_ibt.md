---
title: Configuring Harvester to Boot from an iSCSI Root Disk in Special Circumstances
description: How to modify GRUB configuration so Harvester will use system firmware to access an iSCSI boot/root disk
slug: install_iscsi_firmware_install_boot
authors:
  - name: Jeff Radick
    title: Staff Software Engineer
tags: [harvester]
hide_table_of_contents: false
---

Through v1.3.0, no explicit support has been provided for using Harvester (installing, booting, and running) with any type of storage that is not locally attached. This is in keeping with the philosophy of Hyper-Converged Infrastructure (HCI), which by definition hosts computational capability, storage, and networking in a single device or a set of similar devices operating in a cluster.

However, there are certain limited conditions that allow Harvester to be used on nodes without locally-attached bootable storage devices. Specifically, the use of converged network adapters (CNAs) as well as manual changes to the boot loader configuration of the installed system are required.

## Concepts, Requirements, and Limitations

This section describes background concepts and outlines requirements and limitations that you must consider before performing the procedure. For more information about the described concepts, see the references listed at the end of this article.

### iSCSI Concepts and Terminology

SCSI (Small Computer System Interface) is a set of standards for transferring data between computers systems and I/O devices. It is primarily used with storage devices.

The SCSI standards specify the following:
- **SCSI protocol**: A set of message formats and rules of exchange
- **SCSI transports**: Methods for physically connecting storage devices to the computer system and transferring SCSI messages between them

A number of SCSI transports are defined, including the following:
- **SAS (Serial Attached SCSI)** and **UAS (USB Attached SCSI)**: Used to access SCSI storage devices that are directly attached to the computers using that storage
- **FCP (Fibre Channel Protocol)** and **iSCSI (Internet SCSI)**: Permit computer systems to access storage via a Storage Area Network (SAN), where the storage devices are attached to a system other than the computers using that storage

The SCSI protocol is a client-server protocol, which means that all interaction occurs between clients that send requests and a server that services the requests. In the SCSI context, the client is called the **initiator** and the server is called the **target**. iSCSI initiators and targets identify themselves using a specially formatted identifier called an **iSCSI qualified name (IQN)**. The controller used to provide access to the storage devices is commonly called a **host bus adapter (HBA)**.

When using iSCSI, access is provided by a traditional Internet protocol, with an extra layer to encapsulate SCSI commands within TCP/IP messages. This can be implemented entirely in software (transferring messages using a traditional NIC), or it can be "offloaded" to a "smart" NIC that contains the iSCSI protocol and provides access through special firmware. Such NICs, which provide both a traditional Ethernet interface for regular Internet traffic and a higher-level storage interface for iSCSI services, are often called **converged network adapters (CNAs)**.

Systems with iSCSI CNAs can be configured to enable the system bootstrap firmware to boot the system via iSCSI. In addition, if the loaded operating system is aware of such an interface provided by the CNA, it can access the bootstrap device using that firmware interface *as if it were a locally attached device* without requiring initialization of the operating system's full software iSCSI protocol machinery.

### Additional Concepts and Terminology

Harvester must be installed on a bootable storage device, which is referred to as the *boot disk*.

Other storage devices, which are referred to as *non-boot disks*, may also be used in the Harvester ecosystem.

## Purpose of the Procedure Described in this Document

It was not originally envisioned that Harvester would be installed and used on systems without a locally boot disk.
This is in keeping with the philosophy of Hyper-Converged Infrastructure (HCI),
which by definition hosts computational capability, storage, and networking all in a single device
or set of similar devices operating in a cluster.

While the notion of a purely Hyper-Converged Infrastructure is very tidy,
the real world is messy and contains heterogeneous environments
with both Hyper-Converged and non-Hyper-Converged elements.
Users have expressed interest in having Harvester Hyper-Converged systems
be able to make use of non-Hyper-Converged storage.

These notes desribe a way to do this in a particular limited situation.

Through Harvester release 1.3.0, no explicit support has been provided for installing Harvester
to any type of storage which is not locally attached,
nor does it contain any explicit support for booting and running from storage which is not locally attached.

However, it has been observed that systems with CNAs _might_ in fact permit Harvester to do just this.

After some experimentation it has been determined that in _certain cases_ it _does_ work,
_but_ the boot loader configuration of the installed system must be modified after installation,
according to the procedure described in the following sections of this document.

# Requirements and Limitations

The procedures described in this document do not apply to all circumstances.

To the extent possible, necessary requirements and limitations are described here.

## Requirements

For this to work, the node where you are installing Harvester **must** have
a converged NIC providing iSCSI offload capability with firmware support.
This firmware must specifically include iBFT (iSCSI Boot Firmware Table) support.

:::note
This has been tested with Harvester releases 1.2.1 and 1.3.0.
:::

:::note
This has been tested on a Dell PowerEdge R650 system.
It may work with other systems with comparable hardware and firmware iSCSI support.
:::

## Limitations

This procedure is not guaranteed to work on all systems.

This procedure will not work in cases where iSCSI is not implemented in a converged NIC.

This procedure does not work for cases where the nodes boot via PXE.

This procedure only applies when installing Harvester on **bare metal**, not in a virtual machine.

:::note
The boot configuration changes described in the next section **will** persist across node reboots,
but they **will not** persist across system **upgrades**.
:::

# Procedure

The procedure can be summarized in the following steps, each of which is discussed in more detail.

1. Provision storage for your Harvester node on your iSCSI server system.
2. Configure system firmware to boot via iSCSI using the available CNA
3. Boot the Harvester install image and install to the iSCSI device
4. On first Harvester boot after installation, edit the kernel boot parameters in the GRUB kernel command line
5. Permanently edit the GRUB configuration file in the normally read-only partition

Steps for this need to be performed interactively, so a fully automated / unattended installation is **not** possible at this time.

It is **very important** to be aware that if you subsequently upgrade Harvester,
the upgrade **will overwrite** the "permanently edited" GRUB parameters,
so you will have to re-edit those parameters by hand.

## Provision storage for your Harvester node on your iSCSI server system

Before attempting to install Harvester onto a disk accessed by iSCSI,
the storage must first be provisioned on the storage server.

The details depend on the storage server and will not be discussed here.

However, several pieces of information must be obtained
in order for the system being installed to be able
to access the storage using iSCSI.

* The IP address and port number of the iSCSI server.
* The iSCSI Qualified Name (IQN) of the iSCSI target on the server.
* The LUN of the volume on the server to be accessed from the client as the disk on which Harvester will be installed.
* Depending on on how the server is administered, authentication parameters may also be required.

These items of information will be determined by the server system.

In addition, an IQN must be chosen for the client system to be used as its initiator identifier.

An IQN is a string in a certain format.
In general, any string in the defined format can be used as long as it is unique.
However, specific environments may place stricter requirements on the choice of names.

The format of an IQN is illustrated in the following example:

```
    iqn.2024-02.com.example:cluster1-node0-boot-disk
```

There are lots of variations of this format, and this is just an example.

The correct name to use should be chosen in consultation with the administrator of your storage server and storage area network.

## Configure system firmware to boot via iSCSI using the available CNA

When your system to be installed powers on or is reset, you must enter the firmware setup menu to change the boot settings and enable booting via iSCSI.

Precise details for this are difficult to provide because they vary from system to system.

It is typical to force the system to enter the firmware settings menu by typing a special key such as F2, F7, ESC, etc.
Which one works for your system varies.
Often the system will display a list of which key(s) are available for specific firmware functions,
but it is not uncommon for the firmware to erase this list and start to boot after only a very short delay,
so you have to pay close attention.

If in doubt, consult the system provider's documentation.
An example document link is provided in the References section.
Other vendors should provide similar documentation.

The typical things you need to configure are:
* Enable UEFI boot
* Configure iSCSI initiator and target parameters
* Enable the iSCSI device in the boot menu
* Set the boot order so that your system will boot from the iSCSI device

## Boot the Harvester install image and install to the iSCSI device

This can be done by whatever means you would normally use to load the Harvester install image.

The Harvester installer _should_ automatically "see" the iSCSI device in the dialog where you chose the installation destination.
Choose this device to install.

Installation should proceed and complete normally.

When installation completes, your system should reboot.

## On first boot, edit kernel boot parameters in the GRUB kernel command line

As your system starts to come up after the first reboot,
the firmware will load the boot loader (GRUB) from the iSCSI device,
and GRUB will be able to use this device to load the kernel.

However, the kernel will **not** be aware of the iSCSI boot disk **unless** you modify the kernel parameters in the GRUB command line.

If you don't modify the kernel parameters, then system startup procedures will fail to find the `COS_OEM` and other paritions on the boot disk,
and it will be unable to access the `cloud-init` configuration or any of the container images needed to 

The first time the GRUB menu appears after installation, you should stop the GRUB boot loader from automatically loading the kernel,
and edit the kernel command line.

To stop GRUB from automatically loading the kernel, hit the ESC key as soon as the menu appears.
You will only have a few seconds to do this before the system automatically boots.

Then, type "e" to edit the GRUB configuration for the first boot option.

It will show you something similar to the following:

```
setparams 'Harvester v1.3.0'

  # label is kept around for backward compatibility
  set label=${active_label}
  set img=/cOS/active.img
  loopback $loopdev /$img
  source $(loopdev)/etc/cos/bootargs.cfg
  linux ($loopdev)$kernel $kernelcmd ${extra_cmdline} ${extra_active_cmdline}
  initrd ($loopdev)$initramfs
```

Move the cursor down to the line that begins with `linux`, and move the cursor to the end of that line.

Append the following string (two parameters): `rd.iscsi.firmware rd.iscsi.ibft`.

The line beginning with `linux` should now look like this:

```
  linux ($loopdev)$kernel $kernelcmd ${extra_cmdline} ${extra_active_cmdline} rd.iscsi.firmware rd.iscsi.ibft
```

At this point, type Ctrl-X to resume booting with the modified kernel command line.

Now the node should come up normally, and finish with the normal Harvester console screen that shows the cluster and node IP addresses and status.

The the node should operate normally now **but** the kernel boot argument changes will not be preserved across a reboot unless you perform the next step.

## Permanently edit the GRUB configuration file

At this point you need to preserve these boot argument changes.

You can do this from the console by pressing F12 and logging in, or you can use an SSH session over the network.

The changes must be made permanent by editing the GRUB configuration file `grub.cfg`.

The trick here is that the file to be changed is stored in a partition which is normally **read-only**,
so the first thing you must do is to re-mount the volume to be read-write.

Start out by using the `blkid` command to find the device name of the correct partition:

```
    $ sudo -i
    # blkid -L COS_STATE
    /dev/sda4
    #
```

The device name will be something like `/dev/sda4`.  The following examples assume that's the name but you should modify the commands to match what you see on your system.

Now, re-mount that volume to make it writable:

```shell
    # mount -o remount -rw /dev/sda4 /run/initramfs/cos-state
```

Next, edit the `grub.cfg` file.

```shell
    # vim /run/initramfs/cos-state/grub2/grub.cfg
```

Look for `menuentry` directives.  There will be several of these; at least one as a fallback, and one for recovery.  You should apply the same change to all of them.

In each of these, edit the line beginning with `linux` just as you did for the interactive GRUB menu, appending ` rd.iscsi.firmware rd.iscsi.ibft` to the arguments.

Then save the changes.

It is not necessary, but probably advisable to remount that volume again to return it to its read-only state:

```shell
    # mount -o remount -ro /dev/sda4 /run/initramfs/cos-state
```

From this point on, these changes will persist across node reboots.

A few important notes:

* You must perform this same procedure for every node of your cluster that you are booting with iSCSI.
* These changes will be overwritten by the upgrade procedure if you upgrade your cluster to a newer version of Harvester.  Therefore, if you do an upgrade, be sure to re-do the procedure to edit the `grub.cfg` on every node of your cluster that is booting by iSCSI.


# References

1. [SCSI](https://en.wikipedia.org/wiki/SCSI) provides an overview of SCSI and contains references to additional material.
2. [iSCSI](https://en.wikipedia.org/wiki/ISCSI) provides an overview of iSCSI and contains references to additional material.
3. [Converged Network Adapter](https://en.wikipedia.org/wiki/Converged_network_adapter) provides a summary of CNAs and references to additional material.
4. [Harvester Docuementation](https://docs.harvesterhci.io/v1.2/troubleshooting/os/#how-to-permanently-edit-kernel-parameters) provides a general description of how to permanently edit kernel parameters to be used when booting a Harvester node.
5. [Dell PowerEdge R630 Owner's Manual](https://www.dell.com/support/manuals/en-us/poweredge-r630/r630_om_pub/uefi-iscsi-settings?guid=guid-adc7d625-5c7b-469d-ba9c-4a2c704fcc49&lang=en-us) This is an example of relevant vendor documentation.  Other vendors such as HPE, IBM, Lenovo, etc should provide comparable documentation, though the details will vary.
