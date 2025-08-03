'use client';

import React from 'react';
import { Vortex } from '@/components/ui/vortex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Quicksand } from 'next/font/google';
import { ChevronDownIcon } from 'lucide-react';

interface BlogHeroProps {
    categories: string[];
}

const lora = Quicksand({
    weight: '400',
    subsets: ['latin'],
});

const BlogHero: React.FC<BlogHeroProps> = ({ categories }) => {
    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    return (
        <section className="h-screen flex flex-col md:flex-row bg-black text-white overflow-hidden relative">
            <Vortex
                backgroundColor="black"
                baseHue={320}
                rangeY={500}
                className="absolute inset-0 h-[1000px] opacity-50"
            />
            <div className='w-full absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 p-4 backdrop-blur-sm md:flex-row md:gap-0 md:p-0'>
                <div className="md:flex hidden w-full items-center justify-center md:w-1/3">
                    <div className='flex flex-row flex-wrap items-start justify-center gap-4 md:flex-col'>
                        {(categories || []).map((category, index) => (
                            <a
                                href={`#${slugify(category)}`}
                                key={`${slugify(category)}-${index}`}
                                className="whitespace-nowrap text-sm text-left! transition-colors duration-300 hover:text-gray-400"
                            >
                                #{category}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="flex w-full flex-col items-center justify-center text-center md:w-2/3 md:items-start md:pl-8 md:text-left">
                    <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl mb-4">
                        Industry Insights <br />
                        <span className={`${lora.className} text-2xl text-gray-200 sm:text-4xl md:text-5xl`}>delivered to Your Inbox.</span>
                    </h1>
                    <p className="text-xs text-gray-400 md:text-lg mb-8 max-w-xl">
                        Stay ahead of the curve with the latest trends, tips, and stories collected, collated & curated by Microfox & Team.
                    </p>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input
                            type="email"
                            placeholder="your.email@example.com"
                            className="h-12 border-gray-700 bg-gray-800 text-base text-white placeholder:text-gray-500 focus:outline-none"
                        />
                        <Button type="submit" variant="default" size="lg"
                            className='h-12 bg-orange-500 hover:bg-orange-600'
                        >Subscribe</Button>
                    </div>
                </div>
            </div>
            <div className='absolute bottom-0 left-0 right-0 z-10 flex h-24 items-center justify-center'>
                <ChevronDownIcon className='animate-bounce text-4xl text-white' />
            </div>
        </section>
    );
};

export default BlogHero; 