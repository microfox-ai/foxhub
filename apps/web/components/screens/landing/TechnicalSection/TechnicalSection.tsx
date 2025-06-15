import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Bot, Globe, ShieldCheck, Code } from 'lucide-react';

const TechnicalSection = () => {
    const bulletPoints = [
        {
            icon: <Code className="h-6 w-6" />,
            title: "The #1 Code-based Host Agent",
            description: "Microfox connects to 1000+ platforms in real-time, with 93.7% uptime & 5k+ documented tooling selection, making it the most reliable AI host agent in the market.",
        },
        // {
        //     icon: <Zap className="h-6 w-6" />,
        //     title: "Text-to-Automation",
        //     description: "Transform workflows with 90% faster automation creation. Our AI converts text prompts into working automations in under 30 seconds.",
        // },
        {
            icon: <Globe className="h-6 w-6" />,
            title: "Serverless AI Browser",
            description: "Experience 10x faster browsing & 3x cheaper with our serverless architecture. Process 1M+ requests daily with zero infrastructure overhead.",
        },
        {
            icon: <ShieldCheck className="h-6 w-6" />,
            title: "Self-healing Workflows",
            description: "83.5% automation reliability with automatic error detection and recovery. Reduces manual intervention by 10x in comparision to competitor markets.",
        }
    ];

    return (
        <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-10 bg-[#F5F0E8] min-h-screen flex flex-col justify-center">
            <div className="mx-auto w-full max-w-7xl">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                    {/* Video Section */}
                    <motion.div
                        className="w-full lg:flex-1"
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                    >
                        <div className="relative rounded-lg overflow-hidden">
                            <video
                                className="w-full h-auto object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                            >
                                <source src="/images/magixfox-1.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </motion.div>

                    {/* Content Section */}
                    <motion.div
                        className="w-full lg:flex-1 lg:pl-12 xl:pl-20"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-4xl tracking-wide font-thin text-gray-900 mb-2">
                            Powerful Tech that beats the best.
                        </h2>
                        <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 font-regular">
                            Microfox is powered with cutting-edge coding capabilities.
                        </p>
                        <ul className="space-y-4 md:space-y-6 max-w-2xl">
                            {bulletPoints.map((point, index) => (
                                <motion.li
                                    key={index}
                                    className="flex items-start"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="mr-4 mt-1 flex-shrink-0">
                                        {point.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">{point.title}</h3>
                                        <p className="text-sm md:text-base text-gray-700">{point.description}</p>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default TechnicalSection;
