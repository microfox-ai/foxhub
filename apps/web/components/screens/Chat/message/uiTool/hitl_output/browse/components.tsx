"use client";

import { uiHitlMap } from "@/components/screens/Chat/message/uiTool/mappers/uiHitl";
import { MediaGrid } from "../common/media";

export const BrowseMediaGrid = ({
    output,
    toolName,
}: {
    output: uiHitlMap["puppeteer-sls"] | undefined;
    toolName?: string;
}) => {
    console.log("output", output);
    if (!output || !toolName) {
        return null;
    }

    let data = toolName in output ? output[toolName as keyof typeof output] : undefined;
    // if (!data && "image" in output) {
    //     data = output.image;
    // }

    if (data && data.image_sources.length > 0) {
        const images = data.image_sources;
        return <MediaGrid images={images} />;
    }

    return null;
}