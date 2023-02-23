"use strict";(self.webpackChunkharvesterhci_io=self.webpackChunkharvesterhci_io||[]).push([[64],{3905:function(e,t,n){n.d(t,{Zo:function(){return c},kt:function(){return u}});var a=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},i=Object.keys(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var s=a.createContext({}),p=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=p(e.components);return a.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},m=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),m=p(n),u=r,k=m["".concat(s,".").concat(u)]||m[u]||d[u]||i;return n?a.createElement(k,o(o({ref:t},c),{},{components:n})):a.createElement(k,o({ref:t},c))}));function u(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,o=new Array(i);o[0]=m;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,o[1]=l;for(var p=2;p<i;p++)o[p]=n[p];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}m.displayName="MDXCreateElement"},5171:function(e,t,n){n.r(t),n.d(t,{assets:function(){return c},contentTitle:function(){return s},default:function(){return u},frontMatter:function(){return l},metadata:function(){return p},toc:function(){return d}});var a=n(7462),r=n(3366),i=(n(7294),n(3905)),o=["components"],l={title:"Evicting Replicas From a Disk (the CLI way)",description:"Evicting replicas from a disk (the CLI way)",slug:"evicting-replicas-from-a-disk-the-cli-way",authors:[{name:"Kiefer Chang",title:"Engineer Manager",url:"https://github.com/bk201",image_url:"https://github.com/bk201.png"}],tags:["storage","longhorn","disk"],hide_table_of_contents:!1},s=void 0,p={permalink:"/kb/evicting-replicas-from-a-disk-the-cli-way",editUrl:"https://github.com/harvester/harvesterhci.io/edit/main/kb/kb/2023-01-12/evict_replicas_from_a_disk.md",source:"@site/kb/2023-01-12/evict_replicas_from_a_disk.md",title:"Evicting Replicas From a Disk (the CLI way)",description:"Evicting replicas from a disk (the CLI way)",date:"2023-01-12T00:00:00.000Z",formattedDate:"January 12, 2023",tags:[{label:"storage",permalink:"/kb/tags/storage"},{label:"longhorn",permalink:"/kb/tags/longhorn"},{label:"disk",permalink:"/kb/tags/disk"}],readingTime:1.935,truncated:!1,authors:[{name:"Kiefer Chang",title:"Engineer Manager",url:"https://github.com/bk201",image_url:"https://github.com/bk201.png",imageURL:"https://github.com/bk201.png"}],frontMatter:{title:"Evicting Replicas From a Disk (the CLI way)",description:"Evicting replicas from a disk (the CLI way)",slug:"evicting-replicas-from-a-disk-the-cli-way",authors:[{name:"Kiefer Chang",title:"Engineer Manager",url:"https://github.com/bk201",image_url:"https://github.com/bk201.png",imageURL:"https://github.com/bk201.png"}],tags:["storage","longhorn","disk"],hide_table_of_contents:!1},prevItem:{title:"Scan and Repair Root Filesystem of VirtualMachine",permalink:"/kb/scan-and-repair-vm-root-filesystem"},nextItem:{title:"NIC Naming Scheme",permalink:"/kb/nic-naming-scheme"}},c={authorsImageUrls:[void 0]},d=[{value:"Preparation",id:"preparation",level:2},{value:"Evicting replicas from a disk",id:"evicting-replicas-from-a-disk",level:2}],m={toc:d};function u(e){var t=e.components,n=(0,r.Z)(e,o);return(0,i.kt)("wrapper",(0,a.Z)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("p",null,"Harvester replicates volumes data across disks in a cluster. Before removing a disk, the user needs to evict replicas on the disk to other disks to preserve the volumes' configured availability. For more information about eviction in Longhorn, please check ",(0,i.kt)("a",{parentName:"p",href:"https://longhorn.io/docs/1.3.2/volumes-and-nodes/disks-or-nodes-eviction/"},"Evicting Replicas on Disabled Disks or Nodes"),"."),(0,i.kt)("h2",{id:"preparation"},"Preparation"),(0,i.kt)("p",null,"This document describes how to evict Longhorn disks using the ",(0,i.kt)("inlineCode",{parentName:"p"},"kubectl")," command. Before that, users must ensure the environment is set up correctly.\nThere are two recommended ways to do this:"),(0,i.kt)("ol",null,(0,i.kt)("li",{parentName:"ol"},"Log in to any management node and switch to root (",(0,i.kt)("inlineCode",{parentName:"li"},"sudo -i"),")."),(0,i.kt)("li",{parentName:"ol"},"Download Kubeconfig file and use it locally",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},"Install ",(0,i.kt)("inlineCode",{parentName:"li"},"kubectl")," and ",(0,i.kt)("inlineCode",{parentName:"li"},"yq")," program manually."),(0,i.kt)("li",{parentName:"ul"},"Open Harvester GUI,  click ",(0,i.kt)("inlineCode",{parentName:"li"},"support")," at the bottom left of the page and click ",(0,i.kt)("inlineCode",{parentName:"li"},"Download KubeConfig")," to download the Kubeconfig file."),(0,i.kt)("li",{parentName:"ul"},"Set the Kubeconfig file's path to ",(0,i.kt)("inlineCode",{parentName:"li"},"KUBECONFIG")," environment variable. For example, ",(0,i.kt)("inlineCode",{parentName:"li"},"export KUBECONFIG=/path/to/kubeconfig"),".")))),(0,i.kt)("h2",{id:"evicting-replicas-from-a-disk"},"Evicting replicas from a disk"),(0,i.kt)("ol",null,(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"List Longhorn nodes (names are identical to Kubernetes nodes):"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"kubectl get -n longhorn-system nodes.longhorn.io\n")),(0,i.kt)("p",{parentName:"li"},"Sample output:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"NAME    READY   ALLOWSCHEDULING   SCHEDULABLE   AGE\nnode1   True    true              True          24d\nnode2   True    true              True          24d\nnode3   True    true              True          24d\n"))),(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"List disks on a node. Assume we want to evict replicas of a disk on ",(0,i.kt)("inlineCode",{parentName:"p"},"node1"),":"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"kubectl get -n longhorn-system nodes.longhorn.io node1 -o yaml | yq e '.spec.disks'\n")),(0,i.kt)("p",{parentName:"li"},"Sample output:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"default-disk-ed7af10f5b8356be:\n  allowScheduling: true\n  evictionRequested: false\n  path: /var/lib/harvester/defaultdisk\n  storageReserved: 36900254515\n  tags: []\n"))),(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"Assume disk ",(0,i.kt)("inlineCode",{parentName:"p"},"default-disk-ed7af10f5b8356be")," is the target we want to evict replicas out of."),(0,i.kt)("p",{parentName:"li"},"Edit the node:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"kubectl edit -n longhorn-system nodes.longhorn.io node1 \n")),(0,i.kt)("p",{parentName:"li"},"Update these two fields and save:"),(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"spec.disks.<disk_name>.allowScheduling")," to ",(0,i.kt)("inlineCode",{parentName:"li"},"false")),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"spec.disks.<disk_name>.evictionRequested")," to ",(0,i.kt)("inlineCode",{parentName:"li"},"true"))),(0,i.kt)("p",{parentName:"li"},"Sample editing:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"default-disk-ed7af10f5b8356be:\n  allowScheduling: false\n  evictionRequested: true\n  path: /var/lib/harvester/defaultdisk\n  storageReserved: 36900254515\n  tags: []\n"))),(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"Wait for all replicas on the disk to be evicted."),(0,i.kt)("p",{parentName:"li"},"Get current scheduled replicas on the disk:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"kubectl get -n longhorn-system nodes.longhorn.io node1 -o yaml | yq e '.status.diskStatus.default-disk-ed7af10f5b8356be.scheduledReplica'\n")),(0,i.kt)("p",{parentName:"li"},"Sample output:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"pvc-86d3d212-d674-4c64-b69b-4a2eb1df2272-r-7b422db7: 5368709120\npvc-b06f0b09-f30c-4936-8a2a-425b993dd6cb-r-bb0fa6b3: 2147483648\npvc-b844bcc6-3b06-4367-a136-3909251cb560-r-08d1ab3c: 53687091200\npvc-ea6e0dff-f446-4a38-916a-b3bea522f51c-r-193ca5c6: 10737418240\n")),(0,i.kt)("p",{parentName:"li"},"Run the command repeatedly, and the output should eventually become an empty map:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre"},"{}\n")),(0,i.kt)("p",{parentName:"li"},"This means Longhorn evicts replicas on the disk to other disks."),(0,i.kt)("div",{parentName:"li",className:"admonition admonition-note alert alert--secondary"},(0,i.kt)("div",{parentName:"div",className:"admonition-heading"},(0,i.kt)("h5",{parentName:"div"},(0,i.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,i.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,i.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,i.kt)("div",{parentName:"div",className:"admonition-content"},(0,i.kt)("p",{parentName:"div"},"If a replica always stays in a disk, please open the ",(0,i.kt)("a",{parentName:"p",href:"https://docs.harvesterhci.io/v1.1/troubleshooting/harvester#access-embedded-rancher-and-longhorn-dashboards"},"Longhorn GUI")," and check if there is free space on other disks."))))))}u.isMDXComponent=!0}}]);