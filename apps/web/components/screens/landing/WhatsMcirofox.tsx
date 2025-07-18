import { Permanent_Marker, Lexend_Deca } from 'next/font/google';
import { motion, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedMicrofox } from './AnimatedMicrofox';
import { useAuth } from '@/components/auth/AuthProvider';

const permanentMarker = Permanent_Marker({
    subsets: ['latin'],
    weight: ['400'],
});

const lexendDeca = Lexend_Deca({
    subsets: ['latin'],
    weight: ['400'],
});


export const WhatsMicrofox = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const controls = useAnimation();
    const atControls = useAnimation();
    const strikeControls = useAnimation();
    const oControls = useAnimation();
    const titleControls = useAnimation();
    const textWords = ["That's", "more", "like", "it."];
    const textPopupControls = [useAnimation(), useAnimation(), useAnimation(), useAnimation()];
    const buttonStrikeControls = useAnimation();
    const buttonControls = useAnimation();
    const experienceTextControls = useAnimation();
    const { handleSigninWithGoogle, user } = useAuth();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.duration - video.currentTime <= 3) {
                controls.start({ opacity: 0, transition: { duration: 1 } });
            }
            if (video.currentTime < 1) {
                controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 50 } });
            }
        };

        const handleEnded = () => {
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        // Initial animation
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 50 } });
        video.play();


        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [controls]);

    useEffect(() => {
        const sequence = async () => {
            await new Promise(res => setTimeout(res, 8000));

            await strikeControls.start({
                scaleX: 1,
                transition: { duration: 0.4, ease: 'easeInOut' }
            });

            await new Promise(res => setTimeout(res, 300));

            atControls.start({
                clipPath: 'inset(0 50% 0 50%)',
                width: 0,
                transition: {
                    clipPath: { duration: 0.5, ease: 'easeInOut' },
                    width: { duration: 0.2, delay: 0.2, ease: 'easeOut' }
                }
            });

            oControls.start({
                clipPath: 'inset(0 0% 0 0%)',
                transition: { duration: 0.2, ease: 'easeOut', delay: 0.2 }
            });


        };
        sequence();
    }, [atControls, strikeControls, oControls]);

    useEffect(() => {
        titleControls.start({
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, delay: 3, ease: 'easeOut' }
        });
    }, [titleControls]);

    useEffect(() => {
        buttonControls.start({
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, delay: 3.5, ease: 'easeOut' }
        });
    }, [buttonControls]);

    useEffect(() => {
        experienceTextControls.start({
            opacity: 1,
            transition: { duration: 1, delay: 15 }
        });
    }, [experienceTextControls]);

    useEffect(() => {
        const sequence = async () => {
            textPopupControls.forEach((control: any) => {
                control.start({ opacity: 0, transition: { duration: 0, delay: 0 } })
            });
            await new Promise(res => setTimeout(res, 10800));

            const appearAnimations = textPopupControls.map((control, i) =>
                control.start({ opacity: 1, transition: { duration: 0, delay: i * 0.35 } })
            );
            await Promise.all(appearAnimations);

            await new Promise(res => setTimeout(res, 1500));

            const disappearAnimations = textPopupControls.map((control, i) =>
                control.start({ opacity: 0, transition: { duration: 0.2, delay: i * 0.2 } })
            );
            await Promise.all(disappearAnimations);
        };

        sequence();
    }, [textPopupControls]);


    return (
        <div className={`${permanentMarker.className} bg-white`}>
            <div className="relative overflow-hidden bg-white h-screen flex items-center justify-center">
                <div className="absolute h-screen w-full flex flex-col items-center justify-center z-10">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={titleControls}
                    >
                        <p className="relative text-6xl tracking-[0.5em] mb-4 font-bold text-[#FF8C00] flex items-baseline">
                            <span className="text-[#FF8C00]">Wh</span>
                            <motion.span
                                className="relative inline-block"
                                initial={{ clipPath: 'inset(0 0% 0 0%)', width: 'auto' }}
                                animate={atControls}
                            >
                                at
                                <motion.span
                                    className="absolute top-1/2 -left-4 w-full h-[5px] bg-black"
                                    style={{ originX: 0, y: '-50%' }}
                                    initial={{ scaleX: 0 }}
                                    animate={strikeControls}
                                />
                            </motion.span>
                            <motion.span
                                className="inline-block"
                                initial={{ clipPath: 'inset(0 50% 0 50%)' }}
                                animate={oControls}
                            >
                                o
                            </motion.span>
                            <span className="text-[#FF8C00]">&nbsp;is</span>
                        </p>
                    </motion.div>
                    {/* <h1 className="text-[8em] tracking-[0.5em] font-bold ">Microfox</h1> */}
                    <AnimatedMicrofox />
                    <motion.span
                        className={`${lexendDeca.className} text-sm uppercase mt-15 tracking-[1em] font-bold text-neutral-500`}
                        initial={{ opacity: 0 }}
                        animate={experienceTextControls}
                    >
                        Experience the Next level.
                    </motion.span>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={buttonControls}
                    >
                        <Button
                            variant={"ghost"}
                            className={`hover:bg-transparent mt-10 text-2xl px-8 py-4 tracking-[0.25em]`}
                        >
                            <motion.div
                                className="relative"
                                onHoverStart={() => {
                                    buttonStrikeControls.start({
                                        clipPath: 'inset(0 0% 0 0)',
                                        transition: { duration: 0.3, ease: 'easeInOut' }
                                    });
                                }}
                                onHoverEnd={() => {
                                    buttonStrikeControls.start({
                                        clipPath: 'inset(0 100% 0 0)',
                                        transition: { duration: 0.3, ease: 'easeInOut' }
                                    });
                                }}
                                onClick={() => {
                                    handleSigninWithGoogle();
                                }}
                            >
                                <span className='py-4'> Join the List.</span>
                                <motion.div
                                    className="absolute -bottom-2 -left-2 w-full h-[2px] bg-black"
                                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                                    animate={buttonStrikeControls}
                                />
                            </motion.div>
                        </Button>
                    </motion.div>
                </div>
                <motion.div
                    className="absolute -bottom-10 right-0 z-5"
                    initial={{ x: '100vw', opacity: 1 }}
                    animate={controls}
                >
                    <motion.div className="absolute top-[20%] -left-[50%] right-[100%] z-15">
                        <p className={`relative flex flex-col items-end text-2xl tracking-[0.5em] font-bold text-neutral-500 w-full`}>
                            {textWords.map((word, i) => (
                                <motion.span
                                    key={word}
                                    initial={{ opacity: 1 }}
                                    animate={textPopupControls[i]}
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </p>
                    </motion.div>
                    <video
                        ref={videoRef}
                        muted
                        autoPlay
                        loop
                        className="rounded-lg w-[250px] h-auto"
                    >
                        <source src="/videos/microfox-movesout.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </motion.div>
            </div>
        </div>
    )
}