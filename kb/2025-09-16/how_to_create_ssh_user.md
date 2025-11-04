---
title: How to create an SSH user for Harvester nodes
description: 'How to create an SSH user for Harvester nodes'
slug: how_to_create_ssh_user
authors:
  - name: Masashi Homma
    title: Senior Support Engineer
    url: https://github.com/masap
    image_url: https://github.com/masap.png
tags: [configuration, network]
hide_table_of_contents: false
---
We have the default SSH user `rancher`, but other users may be required. Creating users with `useradd` will result in their deletion upon restarting the Harvester node; therefore, follow the steps below to create persistent SSH users.

## Public Key Authentication
### Create cloud-init.yaml
Create `cloud-init.yaml` with the following content.
- Modify the `matchSelector` if you want to create an SSH user only on specific nodes.
- `#cloud-config` should be written exactly as shown.
- User must be in the `admin` group.
- Specify the public key in `ssh_authorized_keys`.
- Modify the `contents` according to your environment.

```yaml
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: add-test-user
spec:
  matchSelector: {} # applies to all nodes
  filename: 99_add_test_user.yaml
  contents: |
    #cloud-config
    users:
      - name: test-user
        gecos: "admin_user"
        groups: [users, admin]
        sudo: ALL=(ALL) NOPASSWD:ALL
        shell: /bin/bash
        ssh_authorized_keys:
        - ssh-rsa AAAA.... # <--insert full authorized key here, e.g. from your ~/.ssh/id_rsa.pub file
```

## Password Authentication
### Create password hash

Use the following command to create a password hash. Replace `test` with your actual password.

```shell
$ openssl passwd -6 'test'
$6$zF26pcXOS2eaivX8$6ySoTzQC2cToz29mGFC0DuG5cVWTv3Mktc3k/g1KXTtrG2BhsFh8xs3N0zBmNx0D/H4f1W48a45vI1RK8Rzs.0
```

### Create cloud-init.yaml
Create `cloud-init.yaml` with the following content.
- Modify the `matchSelector` if you want to create an SSH user only on specific nodes.
- `#cloud-config` should be written exactly as shown.
- User must be in the `admin` group.
- Specify the hash created earlier in `passwd`.
- Modify the `contents` according to your environment.

```yaml
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: add-test-user
spec:
  matchSelector: {} # applies to all nodes
  filename: 99_add_test_user.yaml
  contents: |
    #cloud-config
    users:
      - name: test-user
        gecos: "admin_user"
        groups: [users, admin]
        sudo: ALL=(ALL) NOPASSWD:ALL
        shell: /bin/bash
        lock_passwd: false
        passwd: $6$zF26pcXOS2eaivX8$6ySoTzQC2cToz29mGFC0DuG5cVWTv3Mktc3k/g1KXTtrG2BhsFh8xs3N0zBmNx0D/H4f1W48a45vI1RK8Rzs.0
```

## Apply the YAML file
Apply the YAML with this command.

```shell
kubectl apply -f cloud-init.yaml
```

Trailing file will be created.

```yaml
$ cat /oem/99_add_test_user.yaml
#cloud-config
users:
  - name: test-user
    gecos: "admin_user"
    groups: users, admin
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ...
```

## Reboot Harvester nodes
1. Run `Enable Maintenance Mode` on the Harvester UI.
2. Wait until the state changes to `Maintenance`.
3. Reboot the Harvester node.
4. Run `Disable Maintenance Mode` on the Harvester UI.

After that, SSH login will be possible.

Tested on: Harvester 1.6.0, 1.5.1.
