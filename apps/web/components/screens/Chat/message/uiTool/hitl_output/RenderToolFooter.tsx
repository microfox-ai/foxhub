import { ToolUIPart } from "ai"
import { Package } from "../../types";
import useSWR from "swr";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight } from "lucide-react";
import { useMessageParts } from "../../../MessageProvider";
import { getLastActiveToolPart } from "../../../helpers/parts";
import { BraveSourceBanner } from "./brave/components";
import { UiComponentProps } from "@/server/ui/UiComponentProps";
import { parseMcpType } from "@/server/ui/uiHitl";



/**
 * RenderUiTool is a component that renders a UI tool (tool-ui-<component>) or sticky parts (tool-<component>).
 * usually all hitl or sticky parts (but better make a seperation by them having tool-hitl-)
 * @returns 
 */
export const RenderToolFooter = () => {
    const { activePart, setActivePart, displayParts, message } = useMessageParts();
    const lastActiveToolPart = getLastActiveToolPart(message, activePart) as ToolUIPart;
    const { toolName, mcpName } = parseMcpType(lastActiveToolPart?.type ?? "");
    // const packageNames = toolPackages.map((p) => p.packageName).join(",");

    // 1. check for the tooLPart that is last & display its banner.

    //console.log("lastActiveToolPart", lastActiveToolPart);
    if (mcpName === "brave" && lastActiveToolPart.state == "output-available") {
        return <BraveSourceBanner toolName={toolName} output={((lastActiveToolPart.output as any)?.ui as UiComponentProps["hitl_output"])?.object?.brave} />
    }

    return (
        <div className="flex flex-row gap-2 ">

        </div>
    )
}