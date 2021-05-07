import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

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

function Feature({Svg, title, description}) {
    return (
        <div className={clsx('col col--4')}>
            <div className="text--center">
            </div>
            <div className="text--center padding-horiz--md">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures() {
    return (
        <div className={styles.features}>
            <div className="container">
                <div className="">
                    <h2 className="">Great For</h2>
                    <div className="row">
                        <div className="">On-Prem HCI</div>
                        <div className="">Edge HCI</div>
                        <div className="">Hybrid Cloud</div>
                        <div className="">Containers and VMS in the Same Environment</div>
                    </div>
                </div>


                <div className="">
                    <h1 className="h1"> What is Harvester? </h1>
                    <p className="row">
                        Harvester is a modern Hyperconverged infrastructure (HCI) solution built for bare metal servers using enterprise-grade open source technologies including Kubernetes, Kubevirt and Longhorn.
                        Designed for users looking for a cloud-native HCI solution, Harvester is a flexible and affordable offering capable of putting VM workloads on the edge,
                        close to your IoT, and integrated into your cloud infrastructure.
                    </p>
                </div>

                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>

                <div className="">
                    <h2 className="">How it Works</h2>
                    <div className=""><img src="../img/Harvester-Architecture-3.2-Outlines.svg"/></div>
                </div>

                <div className="">
                    <h2 className="">Get Started</h2>
                    <p>Want to try Harvester?</p>
                    <p>Simply install it directly onto your bare-metal server to get started.</p>
                </div>

                <div className="row">
                    <div>
                        <h2 className="">Lear More</h2>
                        <p>Find out more about Harvester</p>
                    </div>
                    <div>
                        <div>Read the Docs</div>
                        <div>Visit GitHub</div>
                        <div>Join our Slack Community</div>
                        <div>Watch the latest meetup</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
