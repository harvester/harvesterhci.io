---
title: Package your own Toolbox Image
description: How to package your own toolbox image
slug: package_your_own_toolbox_image
authors:
  - name: Vicente Cheng
    title: Senior Software Engineer
    url: https://github.com/Vicente-Cheng
    image_url: https://github.com/Vicente-Cheng.png
tags: [debug, harvester, container]
hide_table_of_contents: false
---

Harvester OS is designed as an immutable operating system, which means you cannot directly install additional packages on it. While there is a way to [install packages](https://docs.harvesterhci.io/dev/troubleshooting/os#how-can-i-install-packages-why-are-some-paths-read-only), it is strongly advised against doing so, as it may lead to system instability.

If you only want to debug with the system, the preferred way is to package the toolbox image with all the needed packages. 

This article shares how to package your toolbox image and how to install any packages on the toolbox image that help you debug the system.

For example, if you want to analyze a storage performance issue, you can install `blktrace` on the toolbox image.


## Create a Dockerfile

```bash
FROM opensuse/leap:15.4

# Install blktrace
RUN zypper in -y \
    blktrace

RUN zypper clean --all
```

## Build the image and push
```bash
# assume you are in the directory of Dockerfile
$ docker build -t harvester/toolbox:dev .
.
.
.
naming to docker.io/harvester/toolbox:dev ...
$ docker push harvester/toolbox:dev
.
.
d4b76d0683d4: Pushed 
a605baa225e2: Pushed 
9e9058bdf63c: Layer already exists 
```

After you build and push the image, you can run the toolbox using this image to trace storage performance.

## Run the toolbox
```bash
# use `privileged` flag only when you needed. blktrace need debugfs, so I add extra mountpoint.
docker run -it --privileged -v /sys/kernel/debug/:/sys/kernel/debug/ --rm harvester/toolbox:dev bash

# test blktrace
6ffa8eda3aaf:/ $ blktrace -d /dev/nvme0n1 -o - | blkparse -i -
259,0   10     3414     0.020814875 34084  Q  WS 2414127984 + 8 [fio]
259,0   10     3415     0.020815190 34084  G  WS 2414127984 + 8 [fio]
259,0   10     3416     0.020815989 34084  C  WS 3206896544 + 8 [0]
259,0   10     3417     0.020816652 34084  C  WS 2140319184 + 8 [0]
259,0   10     3418     0.020817992 34084  P   N [fio]
259,0   10     3419     0.020818227 34084  U   N [fio] 1
259,0   10     3420     0.020818437 34084  D  WS 2414127984 + 8 [fio]
259,0   10     3421     0.020821826 34084  Q  WS 1743934904 + 8 [fio]
259,0   10     3422     0.020822150 34084  G  WS 1743934904 + 8 [fio]

```
