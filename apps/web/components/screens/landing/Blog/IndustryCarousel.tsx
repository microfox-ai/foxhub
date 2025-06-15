'use client';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { IProjects } from './Data';
import Image from 'next/image';
import { useMediaQuery } from '@mui/material';
import media from '@/styles/media';
import ArticleCard from './ArticleCard';
import { ReactNode, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
const IndustryCarousel = ({
    industryName,
    industryArticles,
    theme,
}: {
    industryName: string;
    industryArticles: IProjects[];
    theme: 'dark' | 'light';
}) => {
    const isMobile = useMediaQuery(media.largeMobile);
    const top3HotArticles = useMemo(
        () => industryArticles.filter((article) => article.isHot).slice(0, 3),
        [industryArticles],
    );
    return (
        <div className="w-full py-20">
            <div className="mx-auto w-[calc((100%/12)*10)] max-w-[calc(1492px+(1.5rem*2))]">
                <Header
                    title={
                        <span
                            className={`${theme === 'dark' ? 'text-white' : 'text-black'} block !text-xs uppercase tracking-[0.075rem]`}
                        >
                            {industryName}
                        </span>
                    }
                />
                <div>
                    <Carousel
                        opts={{
                            slidesToScroll: isMobile ? 1 : 2,
                        }}
                        className="my-8 overflow-visible"
                    >
                        <CarouselContent className="-ml-1 flex gap-4">
                            {industryArticles?.filter((article) => !article.isHot).map((article, index) => (
                                <CarouselItem
                                    className={cn(
                                        'group h-fit pl-0 md:basis-[calc(50%-0.5rem)] lg:basis-[calc(50%-0.5rem)]',
                                        theme === 'dark'
                                            ? 'bg-[#17100E] text-white'
                                            : 'bg-gray-100 text-black',
                                    )}
                                >
                                    <ArticleCard
                                        theme={theme}
                                        key={article.title}
                                        article={article}
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselControls />
                    </Carousel>
                </div>

                {/* HOT SECTION */}
                {top3HotArticles.length > 0 && (
                    <>
                        {/* <Header
              title={
                <span
                  className={`${theme === 'dark' ? 'text-white' : 'text-black'} block !text-xs uppercase tracking-[0.075rem]`}
                >
                  {industryName} / <span className="text-orange-500">Hot</span>
                </span>
              }
            /> */}
                        <HotSection theme={theme} top3HotArticles={top3HotArticles} />
                    </>
                )}
            </div>
        </div>
    );
};

const Header = ({ title }: { title: string | ReactNode }) => {
    return (
        <div className="mb-3 flex items-center gap-2 border-b border-neutral-700 py-1 uppercase sm:mb-1 md:mb-6">
            <span className="block h-2 w-2 translate-y-[-1px] bg-orange-500"></span>
            <div className="relative">{title}</div>
        </div>
    );
};
const HotSection = ({
    top3HotArticles,
    theme,
}: {
    top3HotArticles: IProjects[];
    theme: 'dark' | 'light';
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const prevSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? top3HotArticles.length - 1 : prevIndex - 1,
        );
    };

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === top3HotArticles.length - 1 ? 0 : prevIndex + 1,
        );
    };
    const { description, image_url, video_url, stats } =
        top3HotArticles[currentIndex] as IProjects;

    return (
        <div
            className={cn(
                'bg-black text-white',
                theme === 'dark' ? 'bg-black' : 'bg-white',
            )}
        >
            <div className="col-span-full grid grid-cols-12 gap-6">
                {/* Text Content */}
                <div
                    className={cn(
                        'col-span-12 sm:col-span-6',
                        theme === 'dark' ? 'text-white' : 'text-black',
                    )}
                >
                    <p className={cn('w-[83.33%] text-xl md:text-3xl')}>
                        “{description}”
                    </p>
                    <div className="mt-6 flex justify-start gap-2 text-6xl font-semibold">
                        {stats &&
                            stats.map((stat: any, index: number) => (
                                <div className="flex w-full flex-col">
                                    <span className="">{stat.value}</span>
                                    <span className="text-sm text-gray-400">
                                        {stat.description}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
                {/* Pagination */}
                <div
                    className={cn(
                        'col-span-12 row-start-3 self-end pt-1 sm:col-span-6 sm:row-start-2 sm:pt-0',
                        theme === 'dark' ? 'text-white' : 'text-black',
                    )}
                >
                    <div className="mt-auto w-full">
                        <div
                            className={cn(
                                'relative h-[1px] w-full overflow-hidden',
                                theme === 'dark' ? 'bg-neutral-700/50' : 'bg-neutral-200',
                            )}
                        >
                            <div
                                className={`absolute inset-0 h-full bg-current transition-all duration-1000 ease-in-out`}
                                style={{
                                    width:
                                        (currentIndex + 1) * (100 / top3HotArticles.length) + '%',
                                }}
                            ></div>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <span
                                data-i2-child="text"
                                className="text__NkKDj text_xs__nGeVx text_dm_mono__A_YkO text-current/60 !text-xs"
                            >
                                {currentIndex + 1} / {top3HotArticles.length}
                            </span>
                            <div
                                className={cn(
                                    'ml-auto flex gap-2',
                                    theme === 'dark' ? 'text-white' : 'text-black',
                                )}
                            >
                                <button
                                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-neutral-700/80 transition-all duration-300 ease-in-out hover:border-neutral-700 disabled:opacity-50 disabled:hover:cursor-not-allowed disabled:hover:border-neutral-700/80"
                                    aria-label="Move to previous slide"
                                    onClick={prevSlide}
                                >
                                    <ArrowLeft />
                                </button>
                                <button
                                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-neutral-700/80 transition-all duration-300 ease-in-out hover:border-neutral-700 disabled:opacity-50 disabled:hover:cursor-not-allowed disabled:hover:border-neutral-700/80"
                                    aria-label="Move to next slide"
                                    onClick={nextSlide}
                                >
                                    <ArrowRight />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Image Content */}
                <Card
                    className={cn(
                        'relative col-span-12 mt-auto flex w-full items-center overflow-visible rounded-none bg-[#17100E] p-4 sm:col-start-7 sm:col-end-13 sm:row-start-1 sm:row-end-3 sm:mt-0',
                        theme === 'dark' ? 'bg-black' : 'bg-white',
                    )}
                >
                    <CardContent className="w-full p-0">
                        <div className="h-[500px] w-full">
                            {image_url && (
                                <Image
                                    src={image_url}
                                    alt=""
                                    width={300}
                                    height={300}
                                    className="h-full w-full object-cover object-center duration-1000"
                                />
                            )}
                            {video_url && (
                                <video
                                    src={video_url}
                                    autoPlay
                                    loop
                                    muted
                                    className="aspect-square h-full w-full object-cover"
                                />
                            )}
                        </div>
                        {/* <div className="mt-4">
              <p className="font-semibold text-white">SAM FORDE</p>
              <p className="text-sm text-gray-400">
                Merchant Support Manager at Zapiet
              </p>
            </div> */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

function CarouselControls() {
    const isTabletOrLess = useMediaQuery(media.tablet);
    if (isTabletOrLess)
        return (
            <div className="mt-8 flex gap-3">
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
            </div>
        );
    return (
        <>
            <CarouselPrevious />
            <CarouselNext />
        </>
    );
}

export default IndustryCarousel;
