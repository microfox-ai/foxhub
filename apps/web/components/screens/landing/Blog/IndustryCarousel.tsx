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
import { useRouter } from 'next/navigation';
import RemainingArticles from './RemainingArticles';
const IndustryCarousel = ({
    industryName,
    industryArticles,
    theme,
    containerClassName,
    slidesToScroll,
    hotLimit = 3,
    showHotSection = true,
    viewType = 'carousel',
}: {
    industryName: string;
    industryArticles: IProjects[];
    theme: 'dark' | 'light';
    containerClassName?: string;
    slidesToScroll?: number;
    hotLimit?: number;
    showHotSection?: boolean;
    viewType?: 'carousel' | 'list';
}) => {
    const isMobile = useMediaQuery(media.largeMobile);
    const top3HotArticles = useMemo(
        () => showHotSection ? industryArticles.filter((article) => article.isHot).slice(0, hotLimit) : [],
        [industryArticles, hotLimit, showHotSection],
    );
    const remainingArticles = useMemo(
        () => industryArticles.filter((article) => !top3HotArticles.some((hotArticle) => hotArticle.id === article.id)),
        [industryArticles, top3HotArticles],
    );
    return (
        <div className={cn("w-full py-20", containerClassName)}>
            <div className="mx-auto w-[calc((100%/12)*10)] max-w-[calc(1492px+(1.5rem*2))]">


                {/* HOT SECTION */}
                {top3HotArticles.length > 0 && (
                    <>
                        <Header
                            title={
                                <span
                                    className={`${theme === 'dark' ? 'text-white' : 'text-black'} block !text-xs uppercase tracking-[0.075rem]`}
                                >
                                    {industryName} / <span className="text-orange-500">Hot</span>
                                </span>
                            }
                        />
                        <HotSection theme={theme} top3HotArticles={top3HotArticles} isMobile={isMobile} />
                    </>
                )}

                {remainingArticles.length > 0 && !showHotSection && <Header
                    title={
                        <span
                            className={`${theme === 'dark' ? 'text-white' : 'text-black'} block !text-xs uppercase tracking-[0.075rem]`}
                        >
                            {industryName}
                        </span>
                    }
                />}
                {remainingArticles.length > 0 && <div>
                    <RemainingArticles
                        remainingArticles={remainingArticles}
                        theme={theme}
                        slidesToScroll={slidesToScroll}
                        viewType={viewType}
                        isMobile={isMobile}
                    />
                </div>}
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
    isMobile,
}: {
    top3HotArticles: IProjects[];
    theme: 'dark' | 'light';
    isMobile: boolean;
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
    const router = useRouter();

    if (isMobile) {
        return (
            <div className="flex flex-col gap-12">
                {top3HotArticles.map((article) => (
                    <div key={article.id} className="grid grid-cols-1 gap-6">
                        <Card
                            className={cn(
                                'relative w-full items-center overflow-visible rounded-none p-0',
                                theme === 'dark' ? 'bg-black' : 'bg-white',
                                'cursor-pointer hover:scale-105 transition-all duration-300 ease-in-out'
                            )}
                            onClick={() => {
                                if (article.link) {
                                    window.open(article.link, '_blank');
                                }
                            }}
                        >
                            <CardContent className="w-full p-0">
                                <div className="h-[200px] md:h-[300px] w-full">
                                    {article.image_url && (
                                        <img
                                            key={article.image_url}
                                            src={article.image_url}
                                            alt=""
                                            className="h-full w-full object-cover object-center duration-1000"
                                        />
                                    )}
                                    {article.video_url && (
                                        <video
                                            key={article.video_url}
                                            src={article.video_url}
                                            autoPlay
                                            loop
                                            muted
                                            className="aspect-square h-full w-full object-cover"
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <div
                            className={cn(
                                theme === 'dark' ? 'text-white' : 'text-black',
                            )}
                        >
                            <h4 className="text-sm text-gray-400 mb-2">
                                {article.title}
                            </h4>
                            <p
                                onClick={() => {
                                    if (article.link) {
                                        router.push(article.link);
                                    }
                                }}
                                className={cn('w-[83.33%] text-xl md:text-3xl line-clamp-4 text-ellipsis hover:opacity-80 transition-all duration-300 ease-in-out cursor-pointer')}>
                                “{article.description}”
                            </p>
                            <div className="mt-6 flex justify-start gap-2 text-6xl font-semibold">
                                {article.stats &&
                                    article.stats.map((stat: any, index: number) => (
                                        <div key={index} className="flex w-full flex-col">
                                            <span className="">{stat.value}</span>
                                            <span className="text-sm text-gray-400 line-clamp-4 text-ellipsis">
                                                {stat.description}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const { title, description, image_url, video_url, stats, author, created_time } =
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
                    <h4 className="text-sm text-gray-400 mb-2">
                        {title}
                    </h4>
                    <p
                        onClick={() => {
                            if (top3HotArticles[currentIndex]?.link) {
                                router.push(top3HotArticles[currentIndex].link);
                            }
                        }}
                        className={cn('w-[83.33%] text-xl md:text-3xl line-clamp-4 text-ellipsis hover:opacity-80 transition-all duration-300 ease-in-out cursor-pointer')}>
                        “{description}”
                    </p>
                    <div className="mt-6 flex justify-start gap-2 text-6xl font-semibold">
                        {stats &&
                            stats.map((stat: any, index: number) => (
                                <div key={index} className="flex w-full flex-col">
                                    <span className="">{stat.value}</span>
                                    <span className="text-sm text-gray-400 line-clamp-4 text-ellipsis">
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
                        'relative col-span-12 mt-auto flex w-full items-center overflow-visible rounded-none bg-[#17100E] p-0 sm:col-start-7 sm:col-end-13 sm:row-start-1 sm:row-end-3 sm:mt-0',
                        theme === 'dark' ? 'bg-black' : 'bg-white',
                        'cursor-pointer hover:scale-105 transition-all duration-300 ease-in-out'
                    )}
                    onClick={() => {
                        if (top3HotArticles[currentIndex]?.link) {
                            window.open(top3HotArticles[currentIndex].link, '_blank');
                        }
                    }}
                >
                    <CardContent className="w-full p-0">
                        <div className="h-[200px] md:h-[300px] w-full">
                            {image_url && (
                                <img
                                    key={image_url}
                                    src={image_url}
                                    alt=""
                                    className="h-full w-full object-cover object-center duration-1000"
                                />
                            )}
                            {video_url && (
                                <video
                                    key={video_url}
                                    src={video_url}
                                    autoPlay
                                    loop
                                    muted
                                    className="aspect-square h-full w-full object-cover"
                                />
                            )}
                        </div>
                        {/* <div className="mt-2">
                            {created_time && <span>{new Date(created_time).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                            <p className="text-sm text-gray-400">
                                by {author}
                            </p>
                        </div> */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default IndustryCarousel;
