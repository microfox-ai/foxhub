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
import { ExternalLinkIcon } from "lucide-react";

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

    if (toolName == "webSearch") {
        const webSources = output.webSearch.web_sources.map((source, idx) => (
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

                        {source.thumbnail?.src && (
                            <div className="w-full aspect-video rounded-lg overflow-hidden">
                                <img
                                    src={source.thumbnail.src}
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
    }

    if (toolName == "mcp") {
        return <div></div>;
    }

    return null;
};