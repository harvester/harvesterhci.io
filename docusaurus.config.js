// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').DocusaurusConfig} */
const config = {
  title:
    "The open-source hyperconverged infrastructure solution for a cloud-native world",
  tagline: "",
  url: "https://harvesterhci.io",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "harvester", // Usually your GitHub org/user name.
  projectName: "harvesterhci.io", // Usually your repo name.

  presets: [
    [
      'classic',
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
              "https://github.com/harvester/harvesterhci.io/edit/main/static/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        googleAnalytics: {
          trackingID: 'UA-56382716-11',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig: {
    navbar: {
      logo: {
        alt: "Harvester Logo",
        src: "img/logo_horizontal.svg",
      },
      items: [
          {
            href: "https://docs.harvesterhci.io/",
            position: "right",
            label: "Docs",
            className: "navbar__docs",
          },
          {
            href: "https://www.suse.com/c/?s=harvester",
            position: "right",
            label: "Blog",
            className: "navbar__blog",
          },
          {
            to: "kb",
            position: "right",
            label: "Knowledge Base",
            className: "navbar__kb",
          },
          {
            href: "https://github.com/harvester/harvester",
            label: "GitHub",
            position: "right",
            className: "navbar__github btn btn-secondary icon-github",
          },
        {
          type: 'dropdown',
          label: 'More from SUSE',
          position: 'right',
          items: [
            {
              href: 'https://www.rancher.com',
              label: 'Rancher',
              className: 'navbar__icon navbar__rancher',
            },
            {
              href: 'https://elemental.docs.rancher.com/',
              label: 'Elemental',
              className: 'navbar__icon navbar__elemental',
            },
            {
              href: 'https://fleet.rancher.io/',
              label: 'Fleet',
              className: 'navbar__icon navbar__fleet',
            },
            {
              href: 'https://opensource.suse.com/',
              label: 'More Projects...',
              className: 'navbar__icon navbar__suse',
            },
          ],
      },
      ],
    },
    colorMode: {
      // "light" | "dark"
      defaultMode: "light",

      // Hides the switch in the navbar
      // Useful if you want to support a single color mode
      disableSwitch: true,
    },
    footer: {
      style: "dark",
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} harvesterhci.io`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
  },
  customFields: {
    title: "Harvester - Open-source hyperconverged infrastructure",
    description:
      "The open-source hyperconverged infrastructure solution for a cloud-native world",
  },
  plugins: [
    [
      '@docusaurus/plugin-content-blog',
      {
        /**
         * Required for any multi-instance plugin
         */
        id: 'kb',
        path: './kb',
        showReadingTime: true,
        // Please change this to your repo.
        editUrl:
          "https://github.com/harvester/harvesterhci.io/edit/main/",
        blogTitle: 'Harvester HCI knowledge base',
        routeBasePath: 'kb',
        include: ['**/*.{md,mdx}'],
        postsPerPage: 10,
        blogSidebarTitle: 'All Posts',
        blogSidebarCount: 'ALL',
      },
    ],
  ],
};

module.exports = config;
