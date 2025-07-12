"use client";

import { uiHitlMap } from "@/server/ui/uiHitl";
import { ImageSet } from "@/server/ui/types";
import { MediaGrid } from "../common/media";

export const BrowseMediaGrid = ({
    output,
    toolName,
}: {
    output: uiHitlMap["puppeteer-sls"] | undefined;
    toolName?: string;
}) => {
    if (!output || !toolName) {
        return null;
    }

    const data = toolName in output ? output[toolName as keyof typeof output] : undefined;
    if (data && data.image_sources.length > 0) {
        const images = data.image_sources.map((source: ImageSet) => ({
            src: source.src ?? "",
            originalSrc: source.originalSrc,
            title: source.title ?? "",
            url: source.url,
            description: source.description,
        }));

        return <MediaGrid images={images} />;
    }

    return null;
}