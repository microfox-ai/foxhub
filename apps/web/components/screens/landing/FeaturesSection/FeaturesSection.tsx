import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import React from 'react';

interface FeatureItem {
    title: string;
    description: string;
    video: string;
}

const features: FeatureItem[] = [
    {
        title: "One‑prompt setup.",
        description: "No more tangled workflows or technical hand‑holding. Just describe what you need & let Microfox do the rest.",
        video: "/videos/prompt-single.mp4"
    },
    {
        title: "Never juggle apps again.",
        description: "Every tool—Slack, Notion, Gmail, GitHub, and more—talks to each other automatically.",
        video: "/videos/connection.mp4"
    },
    {
        title: "Save time on manual repetitive tasks.",
        description: "From summarizing threads, syncing data, to posting on social media, Microfox can write the code for any requirement..",
        video: "/videos/manual.mp4"
    }
];

const FeaturesSection: React.FC = () => {
    return (
        <section className="w-full py-16 bg-neutral-200">
            <div className="container mx-auto px-4">
                <h3 className='text-5xl font-thin text-left text-neutral-900 mb-4'>
                    Experience Ai at its finest,
                </h3>
                <h3 className='text-5xl font-regular text-left text-neutral-900 mb-12'>
                    Automate your workflows with prompts
                </h3>

                <div className="flex flex-row gap-4">
                    <Button
                        className='bg-neutral-900 text-white font-thin mb-4 rounded-full py-4'
                    >
                        <span className='font-regular px-2'>Hire Microfox</span>
                        <ChevronRight className='w-4 h-4' />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
                    {features.map((feature, index) => (
                        <div key={index} className="rounded-xl">
                            <div className="h-48 bg-neutral-100 rounded-xl mb-6 flex items-center justify-center">
                                <video
                                    className="w-auto h-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                >
                                    <source src={feature.video} type="video/mp4" />
                                </video>
                            </div>
                            <h4 className="text-2xl font-regular tracking-tight text-neutral-900 mb-2">
                                {feature.title}
                            </h4>
                            <p className="text-neutral-400 text-xl">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
