import { BaseCard } from '@/components/elements/Card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';

export const ListItem = React.forwardRef<
    React.ElementRef<'a'>,
    React.ComponentPropsWithoutRef<'a'> & {
        cardStyle?: string;
        imageUrl?: string;
        contentStyle?: string;
        link?: string;
        imageStyle?: string;
        headerTitle?: string;
        cardHeaderStyle?: string;
    }
>(
    (
        {
            className,
            title,
            headerTitle,
            imageUrl,
            cardHeaderStyle,
            type,
            link,
            children,
            cardStyle,
            contentStyle,
            imageStyle,
            ...props
        },
        ref,
    ) => {
        if (type === 'card') {
            return (
                <li className="w-full">
                    <div className="w-full">
                        <a
                            ref={ref}
                            href={link || '#'}
                            onClick={props.onClick}
                            className={cn(
                                'group flex w-full cursor-pointer select-none items-start justify-between rounded-md p-1 py-0 leading-none no-underline outline-none transition-colors hover:text-accent-foreground focus:text-accent-foreground md:p-3',
                                className,
                            )}
                            {...props}
                        >
                            <BaseCard
                                className={cn(
                                    'group w-full bg-transparent p-3 shadow-none transition-all duration-300 group-hover:bg-neutral-700',
                                    cardStyle,
                                )}
                                cardHeader={
                                    headerTitle ? (
                                        <div
                                            className={cn(
                                                'mb-2 flex w-fit items-center gap-2 rounded-full p-1',
                                                cardHeaderStyle,
                                            )}
                                        >
                                            <div className="h-2 w-2 rounded-full bg-black"></div>
                                            <div className="text-xs font-bold text-black">
                                                {headerTitle}
                                            </div>
                                        </div>
                                    ) : null
                                }
                                cardType="simple"
                                cardMedia={
                                    <div className="overflow-hidden">
                                        <Image
                                            src={imageUrl || ''}
                                            priority
                                            alt=""
                                            width={500}
                                            height={500}
                                            className={cn(
                                                'aspect-video w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105',
                                                imageStyle,
                                            )}
                                        />
                                    </div>
                                }
                                cardContent={
                                    <div
                                        className={cn('mt-4 space-y-2 text-white', contentStyle)}
                                    >
                                        <p className="text-sm font-bold md:text-base">
                                            {title}
                                        </p>
                                        {children && (
                                            <p className="line-clamp-1 mt-0 text-sm text-neutral-400">
                                                {children}
                                            </p>
                                        )}
                                    </div>
                                }
                            />
                        </a>
                    </div>
                </li>
            );
        }
        return (
            <li>
                <div className="w-full">
                    <a
                        ref={ref}
                        href={link || '#'}
                        className={cn(
                            'flex cursor-pointer select-none items-start justify-between space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                            className,
                        )}
                        {...props}
                    >
                        <div className="space-y-2">
                            <div className="text-sm font-bold leading-none text-black md:text-base">
                                {title}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {children}
                            </p>
                        </div>
                        <span className="material-symbols-outlined !mt-0 !pt-0 !text-xs !font-bold !text-black">
                            keyboard_arrow_right
                        </span>
                    </a>
                </div>
            </li>
        );
    },
);
