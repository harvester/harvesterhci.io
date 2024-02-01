import React from 'react';

const FeatureList = [
    {
        title: 'Sits on the shoulders of cloud native giants',
        description: (
            <>
                Harvester uses proven and mature open source software (OSS) components to build virtualization instead of proprietary kernels that are kept hidden from view.
            </>
        ),
    },
    {
        title: 'Lower Total Cost of Ownership (TCO)',
        description: (
            <>
                As 100% open source, Harvester is free from the costly license fees of other HCI solutions. Plus, its foundation is based on existing technology such as Linux and kernel-based virtual machines.
            </>
        ),
    },
    {
        title: 'Integrate and prepare for the future',
        description: (
            <>
                Built with cloud native components at its core, Harvester is future-proof as the infrastructure industry shifts toward containers, edge and multi-cloud software engineering.
            </>
        ),
    },
];

function Feature({ Svg, title, description }) {
    return (
        <div className="col-md-4">
            <div className="lc-block text-center">
                <div>
                    <h3>{title}</h3>
                    <p className="font-weight-light">{description}</p>
                </div>
            </div>
        </div>
    );
}

export default function HomepageFeatures() {
    return (
        <main>
            <link rel="stylesheet" type="text/css" href="../css/style-bundle.css" ></link>
            <div>
                <main id="theme-main">
                    <section className="bg-primary" style={{ paddingBottom: '150px' }}>
                        <div className="container">
                            <div className="row">
                                <div className="col-md-8 pt-5">
                                    <div className="lc-block text-light">
                                        <div>
                                            <h1 className="text-white">The open-source hyperconverged infrastructure solution for a cloud-native world</h1>
                                        </div>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-lg btn-secondary header-docs" href="https://www.suse.com/products/harvester" role="button" style={{ textTransform: 'none', float: 'left', marginRight: '20px' }}>Get Started</a>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-outline-secondary" href="https://www.youtube.com/watch?v=Ngsk7m6NYf4&amp;feature=youtu.be" role="button" target="_blank" rel="noopener">Watch Demo</a>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="lc-block"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <div className="container">
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="lc-block">
                                        <div className="folder">
                                            <h4>Great for</h4>
                                            <div className="bg-light grid-dynamic text-center">
                                                <h5>Running Kubernetes in VMs on top of Harvester</h5>
                                                <h5>Running containerized workloads on bare metal servers</h5>
                                                <h5>Transitioning and modernizing workloads to cloud-native</h5>
                                                <h5>The edge</h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="pt-5">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="lc-block text-center mb-5">
                                        <div>
                                            <h2 className="h3 font-weight-bolder">What is Harvester?</h2>
                                            <p class="font-weight-light">Harvester is a modern hyperconverged infrastructure (HCI)
                                                solution built for bare metal servers using enterprise-grade open-source technologies
                                                including Linux, KVM, Kubernetes, KubeVirt, and Longhorn. Designed for users looking
                                                for a flexible and affordable solution to run cloud-native and virtual machine (VM)
                                                workloads in your datacenter and at the edge, Harvester provides a single pane of glass
                                                for virtualization and cloud-native workload management.<br /></p>
                                                <div class="lc-block mb-5"><iframe width="560" height="315" src="https://www.youtube.com/embed/MWejWLfuTRg" title="Introducing Harvester HCI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
                                        </div>
                                    </div>
                                    <div className="lc-block"><hr /></div>
                                    <div className="lc-block text-center mt-5 mb-5">
                                        <div>
                                            <h2 className="font-weight-bolder">Why Harvester?</h2>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <div className="container">
                            <div className="row">
                                {FeatureList.map((props, idx) => (
                                    <Feature key={idx} {...props} />
                                ))}
                            </div>
                        </div>
                    </section>
                    <section>
                        <div className="container">
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="lc-block"><hr /></div>
                                    <div className="lc-block text-center mt-5" style={{ marginBottom: '-2rem' }}>
                                        <div>
                                            <h2 className="font-weight-bolder mb-0">How it Works<br /></h2>
                                        </div>
                                    </div>
                                    <div className="lc-block mb-5"><img src="../img/harvester-architecture-update.png" alt="Harvester Architecture Diagram" /></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="pt-4 pb-4" style={{ marginBottom: '-170px' }}>
                        <div className="container">
                            <div className="row">
                                <div className="col-md-1">
                                    <div className="lc-block"></div>
                                </div>
                                <div className="col-md-10 shadow bg-white pt-4 pr-4 pb-4 pl-4">
                                    <div className="lc-block text-center">
                                        <div>
                                            <h2 className="font-weight-bolder mb-0">Get Started</h2>
                                            <p className="font-weight-light">Want to try Harvester?</p>
                                            <p className="font-weight-light lead">Simply install it directly onto your bare-metal server to get started.</p>
                                            <a className="btn btn-lg btn-secondary" href="https://github.com/harvester/harvester/releases" target="_blank" rel="noopener">Download Now</a>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-1">
                                    <div className="lc-block"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="bg-primary" style={{paddingTop: '200px'}}>
                        <div className="container pb-5">
                            <div className="row">
                                <div className="col-md-5 offset-md-1">
                                    <div className="lc-block">
                                        <div>
                                            <h2 className="text-left text-white font-weight-bolder mb-1">Learn More</h2>
                                            <h3 className="font-weight-light text-white">Find out more about Harvester</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-5">
                                    <div className="lc-block learn-more-links" style={{ fontFamily: 'poppins,sans-serif' }}><div>
                                        <p className="mb-2">
                                            <a href="https://docs.harvesterhci.io" className="font-weight-bolder rfs-10 text-white">Read the Docs</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://github.com/rancher/harvester" className="font-weight-bolder rfs-10 text-white">Visit GitHub</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://slack.rancher.io" className="font-weight-bolder rfs-10 text-white">Join our Slack Community</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://www.youtube.com/live/BS2GOa4ktpY?si=KET366mGmW_gjqlk" className="font-weight-bolder rfs-10 text-white">Watch the latest meetup</a>
                                        </p>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </main>
    );
}
