"use strict";(self.webpackChunkharvesterhci_io=self.webpackChunkharvesterhci_io||[]).push([[1039],{3905:function(e,t,i){i.d(t,{Zo:function(){return c},kt:function(){return d}});var n=i(7294);function r(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}function a(e,t){var i=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),i.push.apply(i,n)}return i}function s(e){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?a(Object(i),!0).forEach((function(t){r(e,t,i[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(i)):a(Object(i)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(i,t))}))}return e}function o(e,t){if(null==e)return{};var i,n,r=function(e,t){if(null==e)return{};var i,n,r={},a=Object.keys(e);for(n=0;n<a.length;n++)i=a[n],t.indexOf(i)>=0||(r[i]=e[i]);return r}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)i=a[n],t.indexOf(i)>=0||Object.prototype.propertyIsEnumerable.call(e,i)&&(r[i]=e[i])}return r}var l=n.createContext({}),m=function(e){var t=n.useContext(l),i=t;return e&&(i="function"==typeof e?e(t):s(s({},t),e)),i},c=function(e){var t=m(e.components);return n.createElement(l.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},p=n.forwardRef((function(e,t){var i=e.components,r=e.mdxType,a=e.originalType,l=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),p=m(i),d=r,h=p["".concat(l,".").concat(d)]||p[d]||u[d]||a;return i?n.createElement(h,s(s({ref:t},c),{},{components:i})):n.createElement(h,s({ref:t},c))}));function d(e,t){var i=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=i.length,s=new Array(a);s[0]=p;var o={};for(var l in t)hasOwnProperty.call(t,l)&&(o[l]=t[l]);o.originalType=e,o.mdxType="string"==typeof e?e:r,s[1]=o;for(var m=2;m<a;m++)s[m]=i[m];return n.createElement.apply(null,s)}return n.createElement.apply(null,i)}p.displayName="MDXCreateElement"},9821:function(e,t,i){i.r(t),i.d(t,{assets:function(){return c},contentTitle:function(){return l},default:function(){return d},frontMatter:function(){return o},metadata:function(){return m},toc:function(){return u}});var n=i(7462),r=i(3366),a=(i(7294),i(3905)),s=["components"],o={title:"Mitigating filesystem trim Risk",description:"The potential risk with filesystem trim and how to avoid it",slug:"the_potential_risk_with_filesystem_trim",authors:[{name:"Vicente Cheng",title:"Senior Software Engineer",url:"https://github.com/Vicente-Cheng",image_url:"https://github.com/Vicente-Cheng.png"}],tags:["harvester","rancher integration","longhorn","filesystem trim"],hide_table_of_contents:!1},l=void 0,m={permalink:"/kb/the_potential_risk_with_filesystem_trim",editUrl:"https://github.com/harvester/harvesterhci.io/edit/main/kb/kb/2024-01-30/the_potential_risk_with_fstrim.md",source:"@site/kb/2024-01-30/the_potential_risk_with_fstrim.md",title:"Mitigating filesystem trim Risk",description:"The potential risk with filesystem trim and how to avoid it",date:"2024-01-30T00:00:00.000Z",formattedDate:"January 30, 2024",tags:[{label:"harvester",permalink:"/kb/tags/harvester"},{label:"rancher integration",permalink:"/kb/tags/rancher-integration"},{label:"longhorn",permalink:"/kb/tags/longhorn"},{label:"filesystem trim",permalink:"/kb/tags/filesystem-trim"}],readingTime:3.205,truncated:!1,authors:[{name:"Vicente Cheng",title:"Senior Software Engineer",url:"https://github.com/Vicente-Cheng",image_url:"https://github.com/Vicente-Cheng.png",imageURL:"https://github.com/Vicente-Cheng.png"}],frontMatter:{title:"Mitigating filesystem trim Risk",description:"The potential risk with filesystem trim and how to avoid it",slug:"the_potential_risk_with_filesystem_trim",authors:[{name:"Vicente Cheng",title:"Senior Software Engineer",url:"https://github.com/Vicente-Cheng",image_url:"https://github.com/Vicente-Cheng.png",imageURL:"https://github.com/Vicente-Cheng.png"}],tags:["harvester","rancher integration","longhorn","filesystem trim"],hide_table_of_contents:!1},prevItem:{title:"Configuring Harvester to Boot from an iSCSI Root Disk in Special Circumstances",permalink:"/kb/install_iscsi_firmware_install_boot"},nextItem:{title:"Calculation of Resource Metrics in Harvester",permalink:"/kb/calculation_of_resource_metrics_in_harvester"}},c={authorsImageUrls:[void 0]},u=[{value:"Risks Associated with Filesystem Trim",id:"risks-associated-with-filesystem-trim",level:2},{value:"How to Check If Filesystem Trim Is Enabled",id:"how-to-check-if-filesystem-trim-is-enabled",level:2},{value:"Linux",id:"linux",level:3},{value:"Windows",id:"windows",level:3},{value:"Risk Mitigation",id:"risk-mitigation",level:2},{value:"Linux",id:"linux-1",level:3},{value:"Windows",id:"windows-1",level:3}],p={toc:u};function d(e){var t=e.components,i=(0,r.Z)(e,s);return(0,a.kt)("wrapper",(0,n.Z)({},p,i,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"Filesystem trim is a common way to release unused space in a filesystem. However, this operation is known to cause IO errors when used with Longhorn volumes that are rebuilding. For more information about the errors, see the following issues:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"Harvester: ",(0,a.kt)("a",{parentName:"li",href:"https://github.com/harvester/harvester/issues/4739"},"Issue 4793")),(0,a.kt)("li",{parentName:"ul"},"Longhorn: ",(0,a.kt)("a",{parentName:"li",href:"https://github.com/longhorn/longhorn/issues/7103"},"Issue 7103"))),(0,a.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,a.kt)("div",{parentName:"div",className:"admonition-heading"},(0,a.kt)("h5",{parentName:"div"},(0,a.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,a.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,a.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"important")),(0,a.kt)("div",{parentName:"div",className:"admonition-content"},(0,a.kt)("p",{parentName:"div"},"Filesystem trim was introduced in Longhorn v1.4.0 because of ",(0,a.kt)("a",{parentName:"p",href:"https://github.com/longhorn/longhorn/issues/836"},"Issue 836"),"."),(0,a.kt)("p",{parentName:"div"},"Longhorn volumes affected by the mentioned IO errors can disrupt operations in Harvester VMs that use those volumes. If you are using any of the following Harvester versions, see the instructions for risk mitigation in this article."),(0,a.kt)("table",{parentName:"div"},(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",{parentName:"tr",align:null},"Affected Harvester Version"),(0,a.kt)("th",{parentName:"tr",align:null},"Built-In Longhorn Version"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:null},"v1.2.0"),(0,a.kt)("td",{parentName:"tr",align:null},"v1.4.3")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:null},"v1.2.1"),(0,a.kt)("td",{parentName:"tr",align:null},"v1.4.3")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",{parentName:"tr",align:null},"v1.3.0"),(0,a.kt)("td",{parentName:"tr",align:null},"v1.6.0")))))),(0,a.kt)("h2",{id:"risks-associated-with-filesystem-trim"},"Risks Associated with Filesystem Trim"),(0,a.kt)("p",null,"A consequence of the IO errors caused by filesystem trim is that VMs using affected Longhorn volumes become stuck. Imagine the VM is running critical applications, then becomes unavailable. This is significant because Harvester typically uses Longhorn volumes as VM disks. The IO errors will cause VMs to flap between running and paused states until volume rebuilding is completed."),(0,a.kt)("p",null,"Although the described system behavior does not affect data integrity, it might induce panic in some users. Consider the guest Kubernetes cluster scenario. In a stuck VM, the etcd service is unavailable. The effects of this failure cascade from the Kubernetes cluster becoming unavailable to services running on the cluster becoming unavailable."),(0,a.kt)("h2",{id:"how-to-check-if-filesystem-trim-is-enabled"},"How to Check If Filesystem Trim Is Enabled"),(0,a.kt)("h3",{id:"linux"},"Linux"),(0,a.kt)("p",null,"In most Linux distributions, filesystem trim is enabled by default. You can check if the related service fstrim is enabled by running the following command:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"$ systemctl status fstrim.timer\n\u25cf fstrim.timer - Discard unused blocks once a week\n     Loaded: loaded (/lib/systemd/system/fstrim.timer; enabled; vendor preset: enabled)\n     Active: active (waiting) since Mon 2024-03-18 03:40:24 UTC; 1 week 1 day ago\n    Trigger: Mon 2024-04-01 01:00:06 UTC; 5 days left\n   Triggers: \u25cf fstrim.service\n       Docs: man:fstrim\n\nMar 18 03:40:24 harvester-cluster-01-pool1-49b619f6-tpc4v systemd[1]: Started Discard unused blocks once a week.\n")),(0,a.kt)("p",null,"When the fstrim.timer service is enabled, the system periodically runs fstrim."),(0,a.kt)("h3",{id:"windows"},"Windows"),(0,a.kt)("p",null,"You can check if filesystem trim is enabled by running the following command:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"C:\\> fsutil behavior query DisableDeleteNotify\nNTFS DisableDeleteNotify = 0  (Allows TRIM operations to be sent to the storage device)\nReFS DisableDeleteNotify = 0  (Allows TRIM operations to be sent to the storage device)\n")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"DisableDeleteNotify = 0")," indicates that TRIM operations are enabled. For more information, see ",(0,a.kt)("a",{parentName:"p",href:"https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/fsutil-behavior"},"fsutil behavior")," in the Microsoft documentation."),(0,a.kt)("h2",{id:"risk-mitigation"},"Risk Mitigation"),(0,a.kt)("h3",{id:"linux-1"},"Linux"),(0,a.kt)("p",null,"One way to mitigate the described risks is to disable fstrim services in VMs. fstrim services is enabled by default in many modern Linux distributions.\nYou can determine if fstrim is enabled in VMs that use affected Longhorn volumes by checking the following:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"/etc/fstab"),": Some root filesystems mount with the ",(0,a.kt)("em",{parentName:"p"},"discard")," option."),(0,a.kt)("p",{parentName:"li"},"Example:"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"/dev/mapper/rootvg-rootlv /                       xfs     defaults,discard        0 0\n")),(0,a.kt)("p",{parentName:"li"},"You can disable fstrim on the root filesystem by removing the ",(0,a.kt)("em",{parentName:"p"},"discard")," option."),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"/dev/mapper/rootvg-rootlv /                       xfs     defaults        0 0   <-- remove the discard option\n")),(0,a.kt)("p",{parentName:"li"},"After removing the ",(0,a.kt)("em",{parentName:"p"},"discard")," option, you can remount the root filesystem using the command ",(0,a.kt)("inlineCode",{parentName:"p"},"mount -o remount /")," or by rebooting the VM.")),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},(0,a.kt)("inlineCode",{parentName:"p"},"fstrim.timer"),": When this service is enabled, fstrim executes weekly by default. You can either disable the service or edit the service file to prevent simultaneous fstrim execution on VMs."),(0,a.kt)("p",{parentName:"li"},"You can disable the service using the following command:"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"systemctl disable fstrim.timer\n")),(0,a.kt)("p",{parentName:"li"},"To prevent simultaneous fstrim execution, use the following values in the service file (located at ",(0,a.kt)("inlineCode",{parentName:"p"},"/usr/lib/systemd/system/fstrim.timer"),"):"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"[Timer]\nOnCalendar=weekly\nAccuracySec=1h\nPersistent=true\nRandomizedDelaySec=6000\n")))),(0,a.kt)("h3",{id:"windows-1"},"Windows"),(0,a.kt)("p",null,"To mitigate the described risks, you can disable TRIM operations using the following commands:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"ReFS v2"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"C:\\> fsutil behavior set DisableDeleteNotify ReFS 1\n"))),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("p",{parentName:"li"},"NTFS and ReFS v1"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre"},"C:\\> fsutil behavior set DisableDeleteNotify 1\n")))))}d.isMDXComponent=!0}}]);