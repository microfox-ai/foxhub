"use client";

import { uiHitlMap } from "@/server/ui/uiHitl";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogPortal,
} from "@/components/ui/dialog";
import { motion, useAnimate, AnimationPlaybackControls } from "framer-motion";
import React, { useEffect, useState } from "react";
import { InternalMarkdown } from "../../../text/markdown";
import Link from "next/link";
import { ExternalLinkIcon, ExternalLink, Expand, CrossIcon, XIcon } from "lucide-react";
import { DialogOverlay } from "@radix-ui/react-dialog";
import { WebSearchSource } from "@/server/ui/brave/types";

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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    if (!output || !toolName) {
        return null;
    }

    const data = toolName in output ? output[toolName as keyof typeof output] : undefined;
    if (data && data.image_sources.length > 0) {
        return (<>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                {data.image_sources.map((source, idx) => (
                    <div
                        onClick={() => setSelectedImage(source.thumbnail?.originalSrc ?? source.thumbnail?.src ?? "")}
                        key={idx} className="relative group/media bg-neutral-900 rounded-lg overflow-hidden">
                        <img src={source.thumbnail?.src ?? ""} alt={source.title} className="w-full h-auto object-cover transition-transform duration-300 group-hover/media:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
                            <div className="flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source">
                                    <ExternalLink className="w-4 h-4 text-neutral-800" />
                                </a>
                                <button onClick={() => setSelectedImage(source.thumbnail?.originalSrc ?? source.thumbnail?.src ?? "")} className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="Expand Image">
                                    <Expand className="w-4 h-4 text-neutral-800" />
                                </button>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogPortal>
                    <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-xl    " />
                    <DialogContent

                        className="max-w-3xl bg-transparent border-none shadow-none">
                        {selectedImage && <img src={selectedImage} alt="Expanded view" className="w-auto h-auto object-contain rounded-2xl mx-auto" />}
                        <DialogClose className="bg-black/50 rounded-full p-2 absolute top-2 right-2">
                            <XIcon className="w-4 h-4 text-white" />
                        </DialogClose>
                    </DialogContent>

                </DialogPortal>
            </Dialog>
        </>);
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
                        onClick={() => setSelectedImage(source.thumbnail?.originalSrc ?? source.thumbnail?.src ?? "")}
                        key={source.url + idx} className="relative group/media bg-neutral-900 rounded-lg overflow-hidden flex-shrink-0 min-w-20 h-40 cursor-pointer">
                        <img src={source.thumbnail?.src ?? ""} alt={source.title} className="min-w-20 h-full object-cover transition-transform duration-300 group-hover/media:scale-110" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-end justify-end p-2">
                            <div className="flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">

                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(source.thumbnail?.originalSrc ?? source.thumbnail?.src ?? "")
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
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogPortal>
                    <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-xl    " />
                    <DialogContent

                        className="max-w-3xl bg-transparent border-none shadow-none">
                        {selectedImage && <img src={selectedImage} alt="Expanded view" className="w-auto h-auto object-contain rounded-2xl mx-auto" />}
                        <DialogClose className="bg-black/50 rounded-full p-2 absolute top-2 right-2">
                            <XIcon className="w-4 h-4 text-white" />
                        </DialogClose>
                    </DialogContent>

                </DialogPortal>
            </Dialog>
        </>);
    }

    return null;
}