---
sidebar_position: 6
sidebar_label: 上传镜像
title: ""
keywords:
  - Harvester
  - harvester
  - Rancher
  - rancher
  - 导入镜像
Description: 如果需要在**镜像**页面导入虚拟机镜像，输入集群可以访问的 URL。镜像名称将使用 URL 地址的文件名自动填充。你可以随时在需要时对其进行自定义。
---

# 上传镜像

目前支持三种方式创建镜像：通过 URL 上传镜像、通过本地文件上传镜像、通过卷创建镜像。

### 通过 URL 上传镜像

如果需要在**镜像**页面导入虚拟机镜像，输入集群可以访问的 URL。描述和标签是可选的。

:::note
The image name will be auto-filled using the URL address's filename. 你可以随时自定义镜像的名称。

:::

![](./assets/upload-image.png)

### 通过本地文件上传镜像

目前支持 qcow2、raw 和 ISO 镜像。

:::note
- Please do not refresh the page until the file upload is finished.
:::

![](./assets/upload-image-local.png)


### 通过卷创建镜像

在**卷**页面中，点击**导出镜像**。然后，输入镜像名称来创建镜像。

![](./assets/export-image.png)

### Image labels


You can add labels to the image, which will help identify the OS type more accurately. Additionally, you can also add any custom labels when needed.

If you create an image from a URL, the UI will automatically recognize the OS type and image category based on the image name. However, if you created the image by uploading a local file, you will need to manually select the corresponding labels.

![](./assets/image-labels.png)