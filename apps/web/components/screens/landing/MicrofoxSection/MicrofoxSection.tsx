import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Zap, Rocket, ArrowRight, MessageSquareIcon } from 'lucide-react';
import Image from 'next/image';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const items = [
    {
        title: "Describe your task",
        description: "Tell Microfox what you want to automate in plain text. No technical knowledge needed - just describe your goal.",
        icon: "/filled-icons/aws.svg"
    },
    {
        title: "Watch it build a shard",
        description: "Microfox creates your automation instantly, setting up connections and deploying to the cloud. Test it right away to ensure it works perfectly.",
        icon: <Zap className="w-8 h-8 text-primary" />
    },
    {
        title: "Deploy, Sit back & grow",
        description: "Your automation runs in the background, saving you hours daily. Microfox learns from your patterns and suggests new time-saving opportunities.",
        icon: <Rocket className="w-8 h-8 text-primary" />
    }
];

type Item = typeof items[number];

const items2 = [
    {
        title: "Serverless Compute",
        subheader: "Automate client reporting & analytics",
        description: "The customised code built automations are much more cost efficient and effective then the usal zap operations built on zapier, n8n, make or pipedream.",
        icons: [
            "https://cdn.svgporn.com/logos/aws-lambda.svg",
            "/filled-icons/aws.svg",
            // "/filled-icons/sheets.png",
            // "https://cdn.svgporn.com/logos/google-gmail.svg"
        ],
    },
    {
        title: "Powerful AI Browser use",
        subheader: "Automate your browser tasks with AI",
        description: "Example: Browse through the linkedin profiles to find the person I am meeting with and give me entire cotnextual information 30mins before the meeting on whatsapp.",
        icons: [
            // "/filled-icons/linkedin.svg",
            // "/filled-icons/whatsapp-icon.svg",
            "/filled-icons/chrome.svg",
            "/filled-icons/puppeteer.svg"
        ],
    },
    {
        title: "Dynamic Ai tooling",
        subheader: "Automate content distribution & analytics",
        description: "Microfox create custom Ai tools that can be triggered intelligently for your needs. We support & intelligently select the best Ai models & tools based on your requests or predefined conditions.",
        icons: [
            "https://cdn.svgporn.com/logos/google-bard-icon.svg",
            "https://cdn.svgporn.com/logos/anthropic-icon.svg",
            "https://cdn.svgporn.com/logos/openai-icon.svg",
            "https://cdn.svgporn.com/logos/claude-icon.svg"
        ],
    },
    {
        title: "Human in the loop",
        subheader: "Cross platform Human in the loops",
        description: "Microfox is designed to be human-centric, it comes with cross platform human communication capabilities to ensure smooth workflow operations.",
        icons: [
            "https://cdn.svgporn.com/logos/notion-icon.svg",
            "https://cdn.svgporn.com/logos/slack-icon.svg",
            "https://cdn.svgporn.com/logos/whatsapp-icon.svg",
            "https://cdn.svgporn.com/logos/google-gmail.svg"
        ],
    }
];

type Item2 = typeof items2[number];


const ItemCard2 = ({ item, index }: { item: Item2; index: number }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Calculate x offset based on screen size
    const xOffset = isMobile
        ? (index % 2 === 0 ? 20 : -20)  // Small offset for mobile
        : (index % 2 === 0 ? 100 : -100); // Larger offset for desktop
    const yOffset = -index * 30; // Larger offset for desktop

    return (
        <motion.div
            initial={{ opacity: 0, y: 0, x: 0 }}
            animate={{ opacity: 1, y: yOffset, x: xOffset }}
            transition={{
                duration: 0.5,
                delay: index * 0.2,
                type: "spring",
                stiffness: 100
            }}
            className="bg-card rounded-xl shadow-xl w-full md:w-2/3 px-4 sm:px-8 py-4 border border-neutral-500 hover:border-primary/50 transition-colors relative overflow-hidden"
        >
            <div className="relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-4 items-center">
                        {item.icons.map((icon, iconIndex) => (
                            <Image
                                src={icon}
                                key={iconIndex}
                                alt={`${item.title} icon ${iconIndex + 1}`}
                                width={16}
                                height={16}
                                className="group-hover:scale-110 transition-transform"
                            />
                        ))}
                    </div>
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-1">{item.title}</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm italic">"{item.description}"</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const MicrofoxSection = () => {
    return (
        <section className="w-full min-h-screen relative py-10 sm:py-20 bg-gradient-to-b from-background to-background/80 relative overflow-hidden">
            {/* Main Content */}
            <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                <div className='flex flex-col justify-start'>
                    {/* Header Section */}
                    <div className="my-8 sm:my-16">
                        <h2 className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-2">Hire Microfox </h2>
                        <p className="text-2xl sm:text-3xl lg:text-4xl text-muted-foreground max-w-3xl">
                            Run your digital operations at scale.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col items-start justify-start gap-8 sm:gap-12">
                        {items.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                                className="flex items-center gap-4 sm:gap-8"
                            >
                                <div className="flex-shrink-0">
                                    <span className="text-4xl sm:text-6xl lg:text-8xl font-bold text-neutral-400">{index + 1}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                                    <p className="text-muted-foreground text-base sm:text-xl">
                                        {item.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className='flex flex-col items-center justify-start lg:ml-20 mt-8 lg:mt-40 gap-4 sm:gap-2'>
                    {items2.map((item, index) => (
                        <ItemCard2 key={index} item={item} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MicrofoxSection;
