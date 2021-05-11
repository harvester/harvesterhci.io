import React from 'react';

const FeatureList = [
    {
        title: 'Sits on the shoulders of cloud native giants',
        description: (
            <>
                Harvester uses some of the most proven and mature open source software (OSS) components to build virtualization instead of proprietary kernels that are kept hidden from view.
            </>
        ),
    },
    {
        title: 'Lower Total Cost of Ownership (TCO)',
        description: (
            <>
                As 100% open source, Harvester is free from the costly license fees of other HCI solutions. Plus, with its foundation based on existing technology such as Linux & kernel- based virtual machines.
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
            <div>
                <main id="theme-main">
                    <section className="bg-primary" style={{ paddingBottom: '150px' }}>
                        <div className="container">
                            <div className="row">
                                <div className="col-md-8 pt-5">
                                    <div className="lc-block text-light">
                                        <div>
                                            <h1 className="text-white">The open source hyperconverged infrastructure (HCI) solution for a cloud native world</h1>
                                        </div>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-lg btn-secondary" href="/docs/intro" role="button" style={{ textTransform: 'none', float: 'left', marginRight: '20px' }}>Get Started</a>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-outline-secondary" href="https://www.youtube.com/watch?v=wVBXkS1AgHg" role="button" target="_blank" rel="noopener">Watch Demo</a>
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
                                            <h4>Great For</h4>
                                            <div className="bg-light grid-dynamic text-center">
                                                <h5>On-Prem HCI</h5>
                                                <h5>Edge HCI</h5>
                                                <h5>Hybrid Cloud</h5>
                                                <h5>Containers and VMS in the Same Environment</h5>
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
                                            <p className="font-weight-light">
                                                Harvester is a modern Hyperconverged infrastructure (HCI) solution built for
                                                bare metal servers using enterprise-grade open source technologies including Kubernetes, Kubevirt and
                                                Longhorn. Designed for users looking for a cloud-native HCI solution, Harvester is a flexible and
                                                affordable offering capable of putting VM workloads on the edge, close to your IoT, and integrated into your cloud infrastructure.<br />
                                            </p>
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
                                    <div className="lc-block mb-5"><img src="../img/Harvester-Architecture-3.2-Outlines.svg" alt="" /></div>
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
                                            <a href="https://github.com/rancher/harvester/tree/master/docs" className="font-weight-bolder rfs-10 text-white">Read the Docs</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://github.com/rancher/harvester" className="font-weight-bolder rfs-10 text-white">Visit GitHub</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://rancher-users.slack.com/archives/C01GKHKAG0K" className="font-weight-bolder rfs-10 text-white">Join our Slack Community</a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://youtu.be/EKDtheJxQN4" className="font-weight-bolder rfs-10 text-white">Watch the latest meetup</a>
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
