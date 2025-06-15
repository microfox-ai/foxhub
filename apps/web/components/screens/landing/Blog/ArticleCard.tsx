import { cn } from '@/lib/utils';
import { QuoteIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const ArticleCard = ({
    article,
    theme,
}: {
    article: any;
    theme: 'dark' | 'light';
}) => {
    if (!article.image_url && !article.video_url) {
        return (
            <Link href={article.link} className="flex flex-col justify-between gap-2">
                <div
                    className={cn(
                        'flex h-[250px] w-full items-center justify-center p-4',
                        theme === 'dark' ? 'text-white' : 'text-black',
                    )}
                >
                    <p
                        className={cn(
                            'relative z-20 p-0 pl-6 md:p-4 md:pl-6',
                            theme === 'dark' ? 'text-white' : 'text-black',
                        )}
                    >
                        <QuoteIcon className="absolute -left-1 rotate-180 transform opacity-30" />
                        <span className="block w-full pt-2 leading-tight">
                            <span
                                title={article.description}
                                className={`${(article.description as string).length > 50 ? 'text-base' : 'text-lg'}`}
                            >
                                {article.description}
                            </span>
                        </span>
                        <QuoteIcon className="absolute right-10 -z-10 opacity-30" />
                    </p>
                </div>
                <div
                    className={cn('p-4', theme === 'dark' ? 'text-white' : 'text-black')}
                >
                    <h2 className="line-clamp-1 text-xl font-bold">{article.title}</h2>
                    <div
                        className={cn(
                            'my-4 h-[14px] w-full bg-repeat-x opacity-30',
                            theme === 'dark' ? 'invert-0' : 'invert',
                        )}
                        style={{
                            backgroundImage:
                                'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiI+PHBhdGggZmlsbD0idHJhbnNwYXJlbnQiIGQ9Ik0wIDBoMTJ2MTJIMHoiLz48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)',
                        }}
                    ></div>
                    <div className="flex justify-between">
                        <div className="flex gap-4">
                            {article.stats &&
                                article.stats.map((stats: any) => (
                                    <p className="flex flex-col">
                                        <span className="font-bold">{stats?.value || ''}</span>
                                        <span className="text-xs text-neutral-400">
                                            {stats?.description || ''}
                                        </span>
                                    </p>
                                ))}
                        </div>
                        <p
                            className={cn(
                                "relative h-fit font-bold after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:ease-in after:content-[''] group-hover:after:w-full",
                                theme === 'dark' ? 'after:bg-white' : 'after:bg-black',
                            )}
                        >
                            <span className="block">{article.cta} →</span>
                        </p>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <div className="flex flex-col justify-between gap-2">
            <div className="h-full w-full">
                {article.image_url ? (
                    <Image
                        quality={80}
                        sizes="100vw"
                        src={article.image_url || '/images/abstract-red.png'}
                        alt={article.title}
                        width={300}
                        height={500}
                        className="aspect-video h-[250px] w-full object-cover"
                    />) :
                    (<video
                        src={article?.video_url || ''}
                        className="aspect-video h-[250px] w-full object-cover"
                        autoPlay
                        loop
                        muted
                    />)}
            </div>
            <div
                className={cn('p-4', theme === 'dark' ? 'text-white' : 'text-black')}
            >
                <h2 className="line-clamp-1 text-xl font-bold">{article.title}</h2>
                <div
                    className={cn(
                        'my-4 h-[14px] w-full bg-repeat-x opacity-30',
                        theme === 'dark' ? 'invert-0' : 'invert',
                    )}
                    style={{
                        backgroundImage:
                            'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiI+PHBhdGggZmlsbD0idHJhbnNwYXJlbnQiIGQ9Ik0wIDBoMTJ2MTJIMHoiLz48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)',
                    }}
                ></div>
                <Link
                    href={article.link}
                    className={cn(
                        'flex justify-between',
                        theme === 'dark' ? 'text-white' : 'text-black',
                    )}
                    target='_blank'
                >
                    <p className="line-clamp-2 w-2/3 text-neutral-400">
                        {article.description}
                    </p>
                    <p
                        className={cn(
                            "relative h-fit font-bold after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:ease-in after:content-[''] group-hover:after:w-full",
                            theme === 'dark' ? 'after:bg-white' : 'after:bg-black',
                        )}
                    >
                        <span className="block">{article.cta ?? "Read"} →</span>
                    </p>
                </Link>
            </div>
        </div>
    );
};

export default ArticleCard;
