"use client";

import { uiHitlMap } from "@/components/screens/Chat/message/uiTool/mappers/uiHitl";
import { MediaGrid } from "../common/media";

export const BrowseMediaGrid = ({
    output,
    toolName,
}: {
    output: uiHitlMap["puppeteer-sls"]["extractImagesFromURL"] | undefined;
    toolName?: string;
}) => {
    if (!output || !toolName) {
        return null;
    }

    let data = toolName in output ? output[toolName as keyof typeof output] : undefined;
    // if (!data && "image" in output) {
    //     data = output.image;
    // }

    if (data && data.length > 0) {
        const images = data;
        return <MediaGrid images={images} />;
    }

    return null;
}