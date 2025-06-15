'use client';

import { FlipWords } from '@/components/ui/flip-words';
import { Mrs_Sheppards } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import StackSection from './StackSection';

const words = ['Kickstart with an MVP', 'work with edge-tech devs', ''];
const mrsSheppard = Mrs_Sheppards({ weight: '400', subsets: ['latin'] });
const NewHeroSection = () => {
  return (
    <div className="relative w-full">
      {/* Hero text */}
      <div className="relative z-10 flex h-[100vh] flex-col items-center justify-center gap-4 sm:gap-8 text-center">
        <h1 className="-mt-20 text-4xl sm:text-5xl font-extrabold text-black px-4 sm:px-10 xl:text-6xl">
          Speed-up your business
        </h1>

        <p className="text-xl sm:text-2xl xl:text-3xl font-bold text-neutral-400 text-center px-4 sm:px-8 flex items-center gap-2">
          Save time & resources volumetrically, with effective automations.
        </p>

        <div className="bg-black/80 animate-bounce h-3 w-3 sm:h-4 sm:w-4 rounded-full p-0 text-xs text-white"></div>

        <div className='absolute bottom-4 sm:bottom-6 left-0 w-full'>
          <div className='w-full'>
            <StackSection />
          </div>
          <p className="w-4/5 mx-auto text-base sm:text-lg text-neutral-400 font-regular md:w-full md:text-xl px-4 sm:px-0">
            Microfox can access & execute tasks across any tool or agent or platform.
          </p>
        </div>

      </div>

      {/* Additional content */}
      {/* <div className="h-unset relative z-10 flex flex-col items-center justify-start gap-16 px-16 max-md:px-12 max-sm:px-4 sm:h-[90vh] sm:gap-8 lg:h-[120vh] xl:flex-row xl:justify-between">
        <div className="mb-0 mt-20 flex flex-[0.75] flex-col items-end justify-end text-left sm:mt-0 sm:gap-8 sm:text-right lg:mb-20 xl:mb-0">
          <h1 className="text-center text-3xl font-extrabold text-black sm:text-5xl lg:text-left">
            Dynamic Code-Gen
          </h1>

          <p className="mx-auto mt-3 w-4/5 text-center text-sm text-black/80 sm:text-lg lg:w-full lg:text-left">
            We work in hyper-speed sprints to achieve edge tech solutions and
            deliver products that aims to beat competition.
          </p>
        </div>
        <div className="mb-20 flex flex-col sm:mb-0 sm:mt-20 lg:mt-0">


          <div className="relative flex items-center justify-between gap-8 overflow-hidden rounded-[3em] px-6 py-3 backdrop-blur-xl before:absolute before:inset-0 before:animate-pump before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 max-md:gap-12 max-sm:gap-8 sm:gap-0">
            <div className="relative z-10 flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                MVPs built
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                Project Scaleups
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-white sm:text-lg">
                Clocked on Time
              </span>
            </div>
          </div>

          <Link
            href="/why-choose-us"
            className="text-md group relative mt-3 flex items-center gap-2 self-center font-bold text-white transition-colors hover:text-white md:self-end"
          >
            Six Reasons on why choose us
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <span className="absolute -bottom-2 left-[50%] h-[3px] bg-white opacity-0 group-hover:animate-border-line group-hover:opacity-100"></span>
          </Link>
        </div>
      </div> */}
    </div>
  );
};

export default NewHeroSection;
