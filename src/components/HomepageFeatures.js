import React from 'react';
import Translate from '@docusaurus/Translate';

const FeatureList = [
    {
        title: (
				<>
					<Translate>Sits on the shoulders of cloud native giants</Translate>
				</>
			),
        description: (
            <>
            	<Translate description="Feature description 1">Harvester uses some of the most proven and mature open source software (OSS) components to build virtualization instead of proprietary kernels that are kept hidden from view.</Translate>
            </>
        ),
    },
    {
        title: (
				<>
					<Translate>Lower Total Cost of Ownership (TCO)</Translate>
				</>
		  ),
        description: (
            <>
               <Translate description="Feature description 2">As 100% open source, Harvester is free from the costly license fees of other HCI solutions. Plus, with its foundation based on existing technology such as Linux & kernel- based virtual machines.</Translate>
            </>
        ),
    },
    {
        title: (
				<>
					<Translate>Integrate and prepare for the future</Translate>
				</>
			),
        description: (
            <>
               <Translate description="Feature description 3">Built with cloud native components at its core, Harvester is future-proof as the infrastructure industry shifts toward containers, edge and multi-cloud software engineering.</Translate>
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
                                            <h1 className="text-white"><Translate description="Harvester title">The open source hyperconverged infrastructure (HCI) solution for a cloud native world</Translate></h1>
                                        </div>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-lg btn-secondary header-docs" href="https://www.suse.com/products/harvester" role="button" style={{ textTransform: 'none', float: 'left', marginRight: '20px' }}><Translate description="get started">Get Started</Translate></a>
                                    </div>
                                    <div className="lc-block">
                                        <a className="btn btn-outline-secondary" href="https://www.youtube.com/watch?v=Ngsk7m6NYf4&amp;feature=youtu.be" role="button" target="_blank" rel="noopener"><Translate description="watch demo">Watch Demo</Translate></a>
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
                                            <h4><Translate>Great For</Translate></h4>
                                            <div className="bg-light grid-dynamic text-center">
                                                <h5><Translate>On-Prem HCI</Translate></h5>
                                                <h5><Translate>Edge HCI</Translate></h5>
                                                <h5><Translate>Hybrid Cloud</Translate></h5>
                                                <h5><Translate>Containers and VMs in the Same Environment</Translate></h5>
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
                                            <h2 className="h3 font-weight-bolder"><Translate>What is Harvester?</Translate></h2>
                                            <p class="font-weight-light">
												<Translate description="Harvester description">
													Harvester is a modern Hyperconverged infrastructure (HCI) solution built for
												bare metal servers using enterprise-grade open source technologies including Kubernetes, Kubevirt and
												Longhorn. Designed for users looking for a cloud-native HCI solution, Harvester is a flexible and
												affordable offering capable of putting VM workloads on the edge, close to your IoT, and integrated into
												your cloud infrastructure.
												</Translate><br /></p>
                                                <div class="lc-block mb-5"><iframe width="560" height="315" src="https://www.youtube.com/embed/MWejWLfuTRg" title="Introducing Harvester HCI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
                                        </div>
                                    </div>
                                    <div className="lc-block"><hr /></div>
                                    <div className="lc-block text-center mt-5 mb-5">
                                        <div>
                                            <h2 className="font-weight-bolder">
												<Translate description="why Harvester">Why Harvester?</Translate>
											</h2>
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
                                            <h2 className="font-weight-bolder mb-0">
														  <Translate description="How it works">
															How it Works
														  </Translate>
														  <br /></h2>
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
                                            <h2 className="font-weight-bolder mb-0">
														  <Translate description="Get Started">Get Started</Translate>
														  </h2>
                                            <p className="font-weight-light"><Translate description="Want to try Harvester?">Want to try Harvester?</Translate></p>
                                            <p className="font-weight-light lead"><Translate description="Simply install it">Simply install it directly onto your bare-metal server to get started.</Translate></p>
                                            <a className="btn btn-lg btn-secondary" href="https://github.com/harvester/harvester/releases" target="_blank" rel="noopener"><Translate description="Download Now">Download Now</Translate></a>
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
                                            <h2 className="text-left text-white font-weight-bolder mb-1"><Translate description="Learn More">Learn More</Translate></h2>
                                            <h3 className="font-weight-light text-white"><Translate description="Find out about harvester">Find out more about Harvester</Translate></h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-5">
                                    <div className="lc-block learn-more-links" style={{ fontFamily: 'poppins,sans-serif' }}><div>
                                        <p className="mb-2">
                                            <a href="docs/" className="font-weight-bolder rfs-10 text-white"><Translate description="Read the docs">Read the Docs</Translate></a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://github.com/rancher/harvester" className="font-weight-bolder rfs-10 text-white"><Translate description="Visit github">Visit GitHub</Translate></a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://rancher-users.slack.com/archives/C01GKHKAG0K" className="font-weight-bolder rfs-10 text-white"><Translate description="Join Slack">Join our Slack Community</Translate></a>
                                        </p>
                                        <p className="mb-2">
                                            <a href="https://www.youtube.com/watch?v=uhdqD7_Mwzw" className="font-weight-bolder rfs-10 text-white"><Translate description="watch meetup">Watch the latest meetup</Translate></a>
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
