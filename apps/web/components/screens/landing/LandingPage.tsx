'use client';

import Image from 'next/image';
import { Suspense } from 'react';
import FooterCtaSection from './FooterCTASection/FooterCtaSection';
import NewHeroSection from './HeroSection/NewHeroSection';
import IdeasSection from './IdeasSection/IdeasSection';
import FeaturesSection from './FeaturesSection/FeaturesSection';
import TechnicalSection from './TechnicalSection/TechnicalSection';
import MicrofoxSection from './MicrofoxSection/MicrofoxSection';
import { BlogSection } from './Blog/BlogSection';
import StackSection from './HeroSection/StackSection';

export const LandingPage = () => {

    return (
        <div>
            {/* Image section */}
            <div className="relative overflow-hidden">
                <div className="absolute left-0 top-0 -z-20 h-full w-full">
                    {/* <Image
                        src="/images/hero.webp"
                        alt="hero"
                        className="h-full w-full object-cover"
                        fill
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                    /> */}
                </div>
                <NewHeroSection />
            </div>
            <MicrofoxSection />
            <FeaturesSection />
            <IdeasSection />
            <TechnicalSection />
            <BlogSection />
            <FooterCtaSection />
        </div>
    );
};
