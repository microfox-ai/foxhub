import { UiComponentProps } from "@/components/screens/Chat/message/uiTool/mappers/UiComponentProps";
import { ToolUIPart } from "ai";
import { BraveMediaGrid, BraveSourceBanner, BraveSourceHeader, BraveWebResults } from "./brave/components";
import { BrowseMediaGrid } from "./browse/components";
import { UiCommonTypes } from "@microfox/types";
import { MediaGrid } from "./common/media";
import { InfoTable } from "./common/info";
import { PostMapper, TempMapper } from "./temp";
import { useMessageParts } from "../../../MessageProvider";
import { useEffect, useState } from "react";
import { TaskPlaceholder } from "./TaskPlaceholder";
import { mapBrowseImageSearch, mapBrowseMcp } from "../mappers/browse/mapper";

export const RenderToolOutput = ({ fullOutput, uiOutput, mcpName, toolName, part }: { fullOutput: any, uiOutput: UiComponentProps["hitl_output"], mcpName: string, toolName: string, part: ToolUIPart<any> }) => {

    const [key, setKey] = useState(0);
    const { activePart } = useMessageParts();

    useEffect(() => {
        setKey(prev => prev + 1);
    }, [activePart, part.toolCallId])


    const outputUi = uiOutput?.uiOutput;
    const isMainSupport = uiOutput?.uiOutput?.supports?.find((s) => s.type === "main");


    // a placeholder UI for taskId type of outputs (if a match is done, update the message both on frontend & backend)

    if (fullOutput.backgroundTask?.taskId) {
        return <TaskPlaceholder taskId={fullOutput.backgroundTask.taskId} fullOutput={fullOutput} mcpName={mcpName} toolName={toolName} />
    }

    switch (mcpName) {
        case "brave":
            switch (toolName) {
                case "webSearch":
                    return (
                        <div className="flex flex-col gap-2">
                            <BraveSourceHeader output={uiOutput.object?.brave} toolName={toolName} />
                            <BraveWebResults output={uiOutput.object?.brave} toolName={toolName} />
                            <BraveSourceBanner toolName={toolName} output={uiOutput.object?.brave} />
                        </div>
                    )
                case "imageSearch":
                    return <BraveMediaGrid toolName={toolName} output={uiOutput.object?.brave} />
            }
        case "puppeteer-sls":
            switch (toolName) {
                case "extractImagesFromURL":
                    return <BrowseMediaGrid toolName={toolName} output={mapBrowseImageSearch(fullOutput?.data)} />
            }
        case "ragreddit":
            // const uiFunctionString = TempMapper.toString();
            // const uiFunction = new Function('data', `return (${uiFunctionString})(data);`);
            // const data = uiFunction(fullOutput.data);
            //console.log("ragreddit", data, fullOutput.data, toolName);
            switch (toolName) {
                case "searchSubreddits":
                    return <InfoTable data={TempMapper(fullOutput.data)} />
                case "searchSubredditPosts":
                    return <InfoTable data={PostMapper(fullOutput.data)} />
            }
    }

    if (outputUi?.namespace === "common" && isMainSupport) {
        const uiFunctionString = isMainSupport?.mapperFunction;
        if (!uiFunctionString) {
            return null;
        }
        const uiFunction = new Function('data', `return (${uiFunctionString})(data);`);
        if (!uiFunction) {
            return null;
        }
        const uiMappedOutput = uiFunction(fullOutput.data);
        if (!uiMappedOutput) {
            return null;
        }
        switch (isMainSupport?.mapInNameSpace as keyof UiCommonTypes) {
            case "MediaGrid": {
                if (uiMappedOutput) {
                    return <MediaGrid images={uiMappedOutput.image_sources} />
                }
                return null;
            }
            case "InfoTable": {
                if (uiMappedOutput) {
                    // return <MediaGrid images={uiMappedOutput.image_sources} />
                    return <InfoTable data={uiMappedOutput} />
                }
                return null;
            }
        }
    }
    // somehow get the uiNamespace from the agentInfo (without builking up the requestCount)
    return null;
}