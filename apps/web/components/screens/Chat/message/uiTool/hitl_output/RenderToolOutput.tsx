import { UiComponentProps } from "@/server/ui/UiComponentProps";
import { ToolUIPart } from "ai";
import { BraveMediaGrid } from "./brave/components";

export const RenderToolOutput = ({ uiOutput, mcpName, toolName, part }: { uiOutput: UiComponentProps["hitl_output"], mcpName: string, toolName: string, part: ToolUIPart<any> }) => {
    if (mcpName === "brave") {
        switch (toolName) {
            // case "webSearch":
            //     return <BraveSourceBanner toolName={toolName} output={uiOutput.object?.brave} />
            case "imageSearch":
                return <BraveMediaGrid toolName={toolName} output={uiOutput.object?.brave} />
        }
    }
    return null;
}