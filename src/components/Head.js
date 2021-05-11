import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function MetadataHead() {
    const {siteConfig} = useDocusaurusContext();
    return (
        <Head>
            <title>{siteConfig.customFields.title}</title>
            <meta property="og:locale" content="en_US" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={siteConfig.customFields.title} />
            <meta property="og:description" content={siteConfig.customFields.description} />
            <meta property="og:url" content={siteConfig.url} />
            <meta property="og:site_name" content="Harvester" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={siteConfig.customFields.title} />
            <meta name="twitter:description" content={siteConfig.customFields.description} />

            <link rel="canonical" href={siteConfig.url} />
            <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"WebSite","url":"https://harvesterhci.io/","name":"Harvester","potentialAction":{"@type":"SearchAction","target":"https://harvesterhci.io/search/{search_term_string}/","query-input":"required name=search_term_string"}}`}</script>
            <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"Organization","url":"https://harvesterhci.io/","name":"Harvester","logo":"https://harvesterhci.io/images/harvester-logo.png"}`}</script>

            <style>
                {
                    `
                        .recentcomments a{display:inline !important;padding:0 !important;margin:0 !important;}
                    `
                }
                
            </style>
        </Head>
      );
}
