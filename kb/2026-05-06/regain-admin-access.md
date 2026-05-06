---
title: Regaining Admin/Root Acccess (Lost Password)
description: 'How to regain administrative access to a Harvester cluster after losing the admin/rancher user password'
slug: regain_admin_access
authors:
  - name: Tim Serong
    title: Principal Software Engineer
    url: https://github.com/tserong
    image_url: https://github.com/tserong.png
tags: [operating system, configuration, security]
hide_table_of_contents: false
---

## You have lost the admin password for the Harvester GUI

The admin password for the Harvester GUI can be reset if you can still login via ssh as the `rancher` user, or if you have the Harvester cluster's kubeconfig file saved locally. For details, see [How can I reset the administrator password?](https://docs.harvesterhci.io/v1.8/faq/#how-can-i-reset-the-administrator-password) in the documentation.

## You have lost the `rancher` user's ssh/console login password

### But you still have the Harvester cluster's kubeconfig

The `rancher` user's ssh/console login password can be reset by creating a CloudInit CRD to update the password. For details, see [Password of user `rancher`](https://docs.harvesterhci.io/v1.8/install/update-harvester-configuration#password-of-user-rancher) in the documentation. Alternately you can create additional users with ssh access as described in [How to create an SSH user for Harvester nodes](../2025-09-16/how_to_create_ssh_user.md).

### You don't have a kubeconfig, but do have physical or remote console access

In this case, the `rancher` user's ssh/console login password can be changed by editing `/oem/90_custom.yaml` on each host.

#### If you can boot the Harvester installer ISO

Boot the Harvester installer, but don't proceed with the regular installation process. Instead, once the installer comes up, press CTRL-ALT-F2 to switch to VT2 and login as the `rancher` user with password `rancher`. Then proceed with the following steps:

1. Run `sudo -i` to become root
2. Mount the COS_OEM partition from the host:
   ```
   # mkdir /tmp/oem
   # mount -L COS_OEM /tmp/oem
   ```
3. Run `vim /tmp/oem/90_custom.yaml` to edit `90_custom.yaml` and change the password for the `rancher` user. You can specify either a plaintext password (not recommended) or a password hash generated with e.g. `openssl passwd -6`. Following is the section that you need to edit:
   ```
   users:
     rancher:
       passwd: <PASSWORD_GOES_HERE>
   ```
4. Reboot the host. You should now be able to log in as the `rancher` user with the new password.

#### You can't boot the Harvester installer ISO, but can still reboot the host and access the boot menu

If you have no other option, then during system boot, edit the grub config and add `rd.break` at the end of the kernel command line (the one that starts with `linux`). This will drop you into the dracut emergency shell, with the root partition mounted under `/sysroot`. Unfortunately, this shell does not contain any text editor programs, which makes life difficult. Trying to edit `/oem/90_custom.yaml` under the circumstances would be unwise. Instead though, you can run this command:

```
# sed -i 's%rancher.*%rancher:$6$j0.h3TQv8RZPHJkB$3SbV978JLT2Qeq4KSCBZitErNlZZGfrDxnGW5HS0wHzWexGyPzeQBoQmQJetUhLFfquv/X5VWL6odxtlEec1u/:20468::::::%' /sysroot/etc/shadow
```

Then, hit CTRL-D to continue, and once the system finishes booting, the `rancher` user's password will be set back to `rancher` _for this boot only_. You can then login on the console and use `vim` to update `/oem/90_custom.yaml` and permanently set the password to something more secure as described in the previous section.

### You don't have a kubeconfig, nor do you have physical or remote console access

I am so very, very sorry.
