import { User as PrismaUser } from "@prisma/client";
import { Racing_Sans_One } from "next/font/google";
import BouncingDots from "./BouncingDots";
import { useClientProject } from "../providers/ClientProjectProvider";
import { CornerDownRightIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const racingSansOne = Racing_Sans_One({ subsets: ["latin"], weight: "400" });

type NoProjectsProps = {
    user: PrismaUser | null;
};

export const NoProjects = ({ user }: NoProjectsProps) => {

    const { createNewProject, mutateBotProjects } = useClientProject();
    const [showSteps, setShowSteps] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const steps = [
        "Creating a new AI agent",
        "Setting up coding workspace",
        "Optimizing for your region",
        "Installing essential tools",
        "Configuring secure & contained environment",
        "Finalizing your Microfox setup"
    ];

    useEffect(() => {
        if (showSteps) {
            const interval = setInterval(() => {
                setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [showSteps, steps.length]);

    const handleCreateProject = async () => {
        setShowSteps(true);
        setCurrentStep(0);
        await createNewProject({
            projectName: "Personal Microfox",
            projectDescription: "Built for sole use of " + user?.name,
            slug: user?.id + "-personal-microfox",
        });
        mutateBotProjects();
        setShowSteps(false);
    };

    return (
        <div className="container mx-auto w-full min-h-screen p-8 flex flex-col justify-center items-center">
            <div className="absolute inset-0 z-0">
                <BouncingDots />
            </div>
            <div className="grid grid-cols-12 gap-4 w-full z-10">
                <div className="col-span-8 p-4 flex flex-col items-start justify-center">
                    <h2 className="text-4xl font-medium mb-2">
                        Hello, {user?.name || <span className="inline-block h-8 w-32 bg-gray-200 rounded animate-pulse"></span>} {":)"}
                    </h2>
                    {/* <p className={`text-gray-500 mt-4 text-xl tracking-widest leading-relaxed`}>
                        Welcome to the Next Level 
                    </p> */}
                    {!showSteps ? (
                        <div
                            onClick={handleCreateProject}
                            className={`cursor-pointer flex flex-row gap-2 mt-4 px-4 items-center justify-start border border-gray-200 rounded-lg p-2`}>
                            <CornerDownRightIcon className="w-4 h-4" />
                            <span> Create your Microfox </span>
                        </div>
                    ) : (
                        <div className="mt-4 w-full">
                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="mb-4 text-lg font-semibold text-gray-800">Setting up your Microfox...</div>
                                    <div className="flex flex-col gap-3 w-full">
                                        {steps.map((step, idx) => (
                                            <motion.div
                                                key={step}
                                                className={`flex items-center gap-3 text-sm ${idx === currentStep ? "text-gray-900" : idx < currentStep ? "text-gray-600" : "text-gray-400"}`}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                <span className="inline-block w-3 h-3 rounded-full border"
                                                    style={{
                                                        background: idx < currentStep ? '#4b5563' : idx === currentStep ? '#111827' : '#e5e7eb',
                                                        borderColor: idx < currentStep ? '#4b5563' : idx === currentStep ? '#111827' : '#e5e7eb',
                                                    }}
                                                ></span>
                                                {step}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <motion.div
                                        className="mt-4 text-gray-500 animate-pulse text-sm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        {currentStep < steps.length - 1 ? "Please wait..." : "Almost done!"}
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}
                </div>
                <div className="col-span-4 flex items-center justify-center">
                    <video
                        className="rounded-lg shadow-lg w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                    >
                        <source src="/videos/microfox-rotate.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
        </div>
    );
}; 