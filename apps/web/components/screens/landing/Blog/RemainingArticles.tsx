
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { IProjects } from './Data';
import { useMediaQuery } from '@mui/material';
import media from '@/styles/media';
import ArticleCard from './ArticleCard';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const RemainingArticles = ({
    remainingArticles,
    theme,
    slidesToScroll,
    viewType,
    isMobile
}: {
    remainingArticles: IProjects[];
    theme: 'dark' | 'light';
    slidesToScroll?: number;
    viewType: 'carousel' | 'list';
    isMobile: boolean;
}) => {
    const router = useRouter();

    if (viewType === 'list') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                {remainingArticles.map((article) => (
                    <div key={article.id} className={cn("grid grid-cols-1 md:grid-cols-6 gap-4 cursor-pointer p-4 rounded-lg", theme === 'dark' ? 'bg-black' : 'bg-white ', 'transition-colors duration-300')} onClick={() => router.push(article.link || '#')}>
                        <div className="md:col-span-2">
                            {article.image_url && <img src={article.image_url} alt={article.title} className="w-full h-[100px] object-cover rounded-lg" />}
                            {article.video_url && <video src={article.video_url} className="w-full h-[100px] object-cover rounded-lg" autoPlay loop muted />}
                        </div>
                        <div className={cn("md:col-span-3", theme === 'dark' ? 'text-white' : 'text-black')}>
                            <h3 className={cn("text-xs line-clamp-2 text-ellipsis", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{article.description}</h3>
                            <p className="text-xl font-semibold line-clamp-4 text-ellipsis hover:opacity-80 transition-all duration-300 ease-in-out cursor-pointer" onClick={() => router.push(article.link || '#')}>{article.title}</p>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Carousel
            opts={{
                slidesToScroll: isMobile ? 1 : (slidesToScroll || 2),
            }}
            className="my-8 overflow-visible"
        >
            <CarouselContent className="-ml-1 flex gap-4">
                {remainingArticles.map((article) => (
                    <CarouselItem
                        key={article.id}
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
    );
}

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


export default RemainingArticles; 