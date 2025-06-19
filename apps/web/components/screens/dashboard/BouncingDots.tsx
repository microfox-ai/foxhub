import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BouncingDots = () => {
    const [dots, setDots] = useState<Array<{ x: number; y: number; id: number }>>([]);
    const [time, setTime] = useState(0);

    const gridSize = 20;

    useEffect(() => {
        // Create multiple bouncing dots
        const initialDots = [
            { x: 5, y: 5, id: 1 },
            { x: 15, y: 10, id: 2 },
            { x: 10, y: 15, id: 3 },
            { x: 8, y: 8, id: 4 },
            { x: 12, y: 12, id: 5 }
        ];
        setDots(initialDots);

        // Animation loop
        const interval = setInterval(() => {
            setTime(prev => prev + 1);
            setDots(prev => prev.map(dot => ({
                ...dot,
                x: (dot.x + Math.sin(time * 0.1 + dot.id) * 0.5 + 1) % gridSize,
                y: (dot.y + Math.cos(time * 0.1 + dot.id) * 0.5 + 1) % gridSize
            })));
        }, 100);

        return () => clearInterval(interval);
    }, [time]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const dotVariants = {
        hidden: { scale: 0, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20
            }
        }
    };

    const bouncingDotVariants = {
        animate: {
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    return (
        <div className="flex justify-center items-center w-full h-full relative overflow-hidden">
            {/* Animated background */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
                animate={{
                    background: [
                        "linear-gradient(45deg, #f0f9ff, #faf5ff, #fdf2f8)",
                        "linear-gradient(45deg, #fdf2f8, #f0f9ff, #faf5ff)",
                        "linear-gradient(45deg, #faf5ff, #fdf2f8, #f0f9ff)"
                    ]
                }}
                transition={{ duration: 4, repeat: Infinity }}
            />

            {/* Grid container */}
            {/* <motion.div
                className="grid grid-cols-20 gap-20 relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {Array.from({ length: gridSize * gridSize }, (_, index) => {
                    const row = Math.floor(index / gridSize);
                    const col = index % gridSize;
                    const isActive = true; //Math.round(dots[0].x) === col && Math.round(dots[0].y) === row;

                    return (
                        <motion.div
                            key={index}
                            className="flex justify-center items-center w-8 h-8"
                            variants={dotVariants}
                        >
                            <motion.div
                                className={`
                                    w-8 h-8 rounded-full
                                    ${isActive
                                        ? 'bg-neutral-50 shadow-lg'
                                        : 'bg-gray-200'
                                    }
                                `}
                                animate={isActive ? "animate" : "visible"}
                                variants={isActive ? bouncingDotVariants : {}}
                            />
                        </motion.div>
                    );
                })}
            </motion.div> */}

        </div>
    );
};

export default BouncingDots; 