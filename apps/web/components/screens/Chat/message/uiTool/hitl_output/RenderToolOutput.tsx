import { UiComponentProps } from "@/server/ui/UiComponentProps";
import { ToolUIPart } from "ai";
import { BraveMediaGrid, BraveSourceBanner, BraveSourceHeader, BraveWebResults } from "./brave/components";
import { BrowseMediaGrid } from "./browse/components";

export const RenderToolOutput = ({ uiOutput, mcpName, toolName, part }: { uiOutput: UiComponentProps["hitl_output"], mcpName: string, toolName: string, part: ToolUIPart<any> }) => {
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
                    return <BrowseMediaGrid toolName={toolName} output={uiOutput.object?.["puppeteer-sls"]} />
            }
    }
    return null;
}