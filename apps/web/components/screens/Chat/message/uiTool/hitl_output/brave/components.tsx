"use client";

import { uiHitlMap } from "@/server/ui/uiHitl";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { motion, useAnimate, AnimationPlaybackControls } from "framer-motion";
import React, { useEffect, useState } from "react";
import { InternalMarkdown } from "../../../text/markdown";
import Link from "next/link";
import { ExternalLinkIcon, ExternalLink, Expand } from "lucide-react";
import { WebSearchSource } from "@/server/ui/brave/types";
import { ImageSet, VideoSet } from "@/server/ui/types";
import { MediaDialog, MediaGrid, MediaDialogItem } from "../common/media";
import { prettyPrintDateAndTime, prettyPrintDateInMMMDD } from "@/utils/helpers/prettyprint";

export const HoverSourcePopup = ({ source }: { source: WebSearchSource }) => {
    return (
        <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center gap-2">
                <img
                    src={source.meta_url?.favicon ?? ""}
                    alt={source.title}
                    className="w-5 h-5 rounded-full"
                />
                <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sm line-clamp-1 hover:underline"
                >
                    {source.title}
                </a>
            </div>

            {(source.thumbnail?.src || source.thumbnail?.originalSrc) && (
                <div className="w-full aspect-video rounded-lg overflow-hidden">
                    <img
                        src={source.thumbnail.originalSrc ?? source.thumbnail.src}
                        alt={source.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {source.description && (
                <p className="text-sm text-neutral-600 line-clamp-3">
                    <InternalMarkdown>{source.description}</InternalMarkdown>
                </p>
            )}

            <Link href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-start gap-1 pt-3 border-t border-neutral-200 mt-1 hover:underline">
                <span className="text-xs text-neutral-500">
                    {new URL(source.url).hostname}
                </span>
                <ExternalLinkIcon className="w-3 h-3" />
            </Link>
        </div>
    )
}

export const BraveSourceBanner = ({
    output,
    toolName,
}: {
    output: uiHitlMap["brave"] | undefined;
    toolName?: string;
}) => {
    const [scope, animate] = useAnimate();
    const [animationControls, setAnimationControls] =
        useState<AnimationPlaybackControls>();

    useEffect(() => {
        if (scope.current) {
            const controls = animate(
                scope.current,
                { x: ["0%", "-200%"] },
                {
                    ease: "linear",
                    duration: 20,
                    repeat: Infinity,
                },
            );
            setAnimationControls(controls);
        }
    }, [animate, scope]);

    if (!output || !toolName) {
        return null;
    }

    const toolOutput = toolName in output ? output[toolName as keyof typeof output] : undefined;

    if (!toolOutput) {
        return null;
    }

    const clubbedSources = [...(toolOutput?.web_sources ?? []), ...(toolOutput?.image_sources ?? []), ...(toolOutput?.video_sources ?? [])];

    const webSources = clubbedSources.map((source, idx) => (
        <HoverCard openDelay={0} key={source.url + idx}>
            <HoverCardTrigger asChild>
                <div className="flex min-w-[200px] bg-neutral-100 rounded-xl px-4 py-1 items-center justify-center">
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row gap-2 cursor-pointer items-center"
                    >
                        <img
                            src={source.meta_url?.favicon ?? ""}
                            alt={source.title}
                            className="w-4 h-4 rounded-full"
                        />
                        <span className="line-clamp-1 text-xs font-regular text-neutral-500">
                            {source.title}
                        </span>
                    </a>
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
                <HoverSourcePopup source={source} />
            </HoverCardContent>
        </HoverCard>
    ));

    return (
        <div
            className="w-full my-4 mb-8 overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]"
            onMouseEnter={() => animationControls?.pause()}
            onMouseLeave={() => animationControls?.play()}
        >
            <motion.div ref={scope} className="flex gap-4">
                {webSources}
                {webSources.map((child) =>
                    React.cloneElement(child, { key: (child.key || '') + "-clone" }),
                )}
            </motion.div>
        </div>
    );

};

export const BraveMediaGrid = ({
    output,
    toolName,
}: {
    output: uiHitlMap["brave"] | undefined;
    toolName?: string;
}) => {
    if (!output || !toolName) {
        return null;
    }

    const data = toolName in output ? output[toolName as keyof typeof output] : undefined;
    if (data && data.image_sources.length > 0) {
        const images: ImageSet[] = data.image_sources.map((source: WebSearchSource) => ({
            src: source.thumbnail?.src ?? "",
            originalSrc: source.thumbnail?.originalSrc,
            title: source.title,
            url: source.url,
            description: source.description,
        }));

        return <MediaGrid images={images} />;
    }

    return null;
}

export const BraveSourceHeader = ({
    output,
    toolName,
}: {
    output: uiHitlMap["brave"] | undefined;
    toolName?: string;
}) => {
    const [selectedMedia, setSelectedMedia] = useState<MediaDialogItem | null>(null);
    if (!output || !toolName) {
        return null;
    }

    const data = toolName in output ? output[toolName as keyof typeof output] : undefined;

    let sources = [...(data?.image_sources ?? []), ...(data?.video_sources ?? [])];
    sources = sources.filter((srx) => srx.thumbnail?.src);
    if (sources.length > 0) {
        return (<>
            <div className="flex gap-2 overflow-x-auto">
                {sources.map((source, idx) => (
                    <div
                        onClick={() => {
                            if (source.media_type === 'video') {
                                setSelectedMedia({
                                    type: 'video', video: {
                                        src: source.url,
                                        ...source.meta_media
                                    }
                                });
                            } else {
                                setSelectedMedia({
                                    type: 'image', image: {
                                        src: source.thumbnail?.src ?? "",
                                        originalSrc: source.thumbnail?.originalSrc,
                                        title: source.title,
                                        url: source.url,
                                        description: source.description,
                                    }
                                });
                            }
                        }}
                        key={source.url + idx} className="relative group/media bg-neutral-900 rounded-lg overflow-hidden flex-shrink-0 min-w-20 h-40 cursor-pointer">
                        <img src={source.thumbnail?.src ?? ""} alt={source.title} className="min-w-20 h-full object-cover transition-transform duration-300 group-hover/media:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-end justify-end p-2">
                            <div className="flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">

                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    if (source.media_type === 'video') {
                                        setSelectedMedia({
                                            type: 'video', video: {
                                                src: source.url,
                                                ...source.meta_media
                                            }
                                        });
                                    } else {
                                        setSelectedMedia({
                                            type: 'image', image: {
                                                src: source.thumbnail?.src ?? "",
                                                originalSrc: source.thumbnail?.originalSrc,
                                                title: source.title,
                                                url: source.url,
                                                description: source.description,
                                            }
                                        });
                                    }
                                }
                                } className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="Expand Image">
                                    <Expand className="w-4 h-4 text-neutral-800" />
                                </button>
                                <HoverCard openDelay={700} key={source.url + idx}>
                                    <HoverCardTrigger asChild>
                                        <a href={source.url}
                                            onClick={(e) => e.stopPropagation()}
                                            target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source">
                                            <ExternalLink className="w-4 h-4 text-neutral-800" />
                                        </a>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                        <HoverSourcePopup source={source} />
                                    </HoverCardContent>
                                </HoverCard>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <MediaDialog media={selectedMedia} setMedia={setSelectedMedia} />
        </>);
    }

    return null;
}

export const BraveWebResults = ({
    output,
    toolName,
}: {
    output: uiHitlMap["brave"] | undefined;
    toolName?: string;
}) => {
    if (!output || !toolName) {
        return null;
    }

    const data = toolName in output ? output[toolName as keyof typeof output] : undefined;

    if (!data || !("web_sources" in data) || !data.web_sources) {
        return null;
    }

    const webSources = data.web_sources;

    if (webSources.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            {webSources.map((source, idx) => (
                <div key={source.url + idx} className="group/web-result">
                    <div className="flex items-center gap-2 mb-1">
                        {source.meta_url?.favicon && (
                            <img
                                src={source.meta_url.favicon}
                                alt=""
                                className="w-6 h-6 p-1 bg-neutral-100 rounded-full"
                            />
                        )}
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col"
                        >
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                {source.meta_url?.hostname ?? new URL(source.url).hostname}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {source.displayDate}
                            </span>
                        </a>
                    </div>
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <h3 className="text-lg line-clamp-1 font-semibold text-neutral-800 hover:underline dark:text-neutral-200 group-hover/web-result:underline">
                            {source.title}
                        </h3>
                    </a>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 line-clamp-3  ">
                        <InternalMarkdown>{source.description ?? ""}</InternalMarkdown>
                    </p>
                </div>
            ))}
        </div>
    );
};