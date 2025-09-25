---
title: 'CPU and Memory Overcommit settings not being applied to existing VMs'
description: 'Batch update the CPU and Memory Overcommit settings to existing VMs in Harvester.'
authors:
  - name: Philip Fischbacher
    title: Support Engineer
    url: https://github.com/pfischbacher
    image_url: https://github.com/pfischbacher.png
tags: [settings, overcommit, cpu, memory]
hide_table_of_contents: false
---
Users may wish to have their most recent modifications to the Overcommit settings applied to all their existing Harvester VMs.

However, Harvester’s CPU/Memory overcommit settings only affect scheduling and resource allocation for new VMs, existing VMs keep the resource limits and requests that were set when they were created. The VM spec isn’t automatically updated when cluster-level defaults change, so you must edit or recreate the VM to apply new overcommit values.

You can use the following script to update ALL your exisiting Harvester VMs in a single Harvester cluster to have the updated CPU and Memory Overcommit settings. This script will not update the Storage overcommit settings.

[Harvester batch update script](https://github.com/pfischbacher/harvester-overcommit-update-script)
