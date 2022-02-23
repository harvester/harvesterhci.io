/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title:
    "The open source hyperconverged infrastructure (HCI) solution for a cloud native world",
  tagline: "",
  url: "https://harvesterhci.io",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "harvester", // Usually your GitHub org/user name.
  projectName: "harvester.github.io", // Usually your repo name.
  themeConfig: {
    colorMode: {
      // "light" | "dark"
      defaultMode: "light",

      // Hides the switch in the navbar
      // Useful if you want to support a single color mode
      disableSwitch: true,
    },
    navbar: {
      title: "",
      logo: {
        alt: "logo",
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
        // {
        //   to: "kb",
        //   position: "right",
        //   label: "Knowledge Base",
        //   className: "navbar__kb",
        // },
        {
          href: "https://github.com/harvester/harvester",
          label: "GitHub",
          position: "right",
          className: "navbar__github btn btn-secondary icon-github",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} harvesterhci.io`,
    },
  },
  customFields: {
    title: "Harvester - Open-source hyperconverged infrastructure",
    description:
      "An open-source hyperconverged infrastructure (HCI) software for a cloud-native world",
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl:
            "https://github.com/harvester/harvester.github.io/edit/master/website/",
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.css")],
        },
      },
    ],
  ],
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
          "https://github.com/harvester/harvester.github.io/edit/master/website/kb/",
        blogTitle: 'Harvester HCI knowledge base',
        routeBasePath: 'kb',
        include: ['**/*.{md,mdx}'],
        postsPerPage: 10,
      },
    ],
  ],
};
