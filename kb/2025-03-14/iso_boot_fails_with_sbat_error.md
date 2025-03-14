---
title: Harvester ISO boot fails with SBAT error
description: 'How to work around "Verifying shim SBAT data failed: Security Policy Violation" error when booting the Harvester installer ISO'
slug: iso_boot_fails_with_sbat_errror
authors:
  - name: Tim Serong
    title: Master Software Engineer
    url: https://github.com/tserong
    image_url: https://github.com/tserong.png
tags: [installation, operating system, secure boot]
hide_table_of_contents: false
---

When installing Harvester on a host that previously had an operating system installed and has UEFI secure boot enabled, the ISO image may fail to boot with the following error:

```
Verifying shim SBAT data failed: Security Policy Violation
Something has gone seriously wrong: SBAT self-check failed: Security Policy Violation
```

This issue is known to occur if openSUSE Leap 15.5 or Harvester v1.3.1 or newer were installed previously. It is also likely to occur if a recent version of Windows was installed previously, and may occur if other Linux variants were installed previously.

The underlying problem is that the Harvester ISO uses a shim bootloader which is older than the bootloader which was previously installed on the host. As a specific example, when you first install Harvester v1.3.1, the ISO is using shim version 15.4, but the system ultimately ends up with shim 15.8 installed, which sets SBAT revocations for older shims. Subsequently attempting to boot the older shim on the ISO will thus fail with the above error.

The workaround for this issue is:

1. Disable secure boot
2. Boot the ISO image and perform the install
3. Re-enable secure boot and boot into the installed system

## References

- Harvester: [Issue 7343](https://github.com/harvester/harvester/issues/7343)
- openSUSE: [Reset SBAT string for booting to old shim in old Leap image](https://en.opensuse.org/openSUSE:UEFI#Reset_SBAT_string_for_booting_to_old_shim_in_old_Leap_image)