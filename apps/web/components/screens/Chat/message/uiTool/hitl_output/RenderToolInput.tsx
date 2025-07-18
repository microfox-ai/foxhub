import { UiComponentProps } from "@/components/screens/Chat/message/uiTool/mappers/UiComponentProps";
import { MyUiTool } from "@/components/screens/Chat/message/uiTool/mappers/uiTool";
import { parseMcpType } from "@/components/screens/Chat/message/uiTool/mappers/uiHitl";
import useSWR from "swr";
import { AgentInfo } from "@microfox/types";
import { Package } from "../../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const RenderToolInput = ({ tool }: {
    tool: MyUiTool & {
        type: `tool-ui-${keyof UiComponentProps}` | `tool-${string}`
    }
}) => {
    const [expanded, setExpanded] = useState(false);
    const hitlOutput = tool.output as any;
    const hitlInput = tool.input as any;

    const { mcpName, toolName } = parseMcpType(tool.type);
    const auth = hitlOutput.auth;

    const { data: agentInfos } = useSWR<AgentInfo[]>(
        `/api/agents/infos?agentNames=${mcpName}`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch agents");
            return res.json();
        }, {
        revalidateOnFocus: false,
    });
    const agentInfo = agentInfos?.find(a => a.agentName === mcpName);

    const title = hitlOutput?.toolSummary || `${agentInfo?.title ?? mcpName}: ${toolName}`;
    const description = hitlInput?.microfoxReasoning || hitlInput?.body?.microfoxReasoning;

    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer mb-2">
            <div className="flex flex-row justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex flex-row gap-3 items-center">
                    {agentInfo?.iconUrl && (
                        <img src={agentInfo.iconUrl} alt={agentInfo.title} className="w-4 h-4 rounded-full" />
                    )}
                    <div className="flex flex-col">
                        <span className="font-semibold">{title}</span>
                        {description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{description}</p>
                        )}
                    </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </div>

            {expanded && Object.keys(hitlInput || {}).length > 0 && (
                <div className="font-mono bg-gray-100 p-2 rounded text-xs mt-2 w-full overflow-x-auto">
                    <pre>{JSON.stringify(hitlInput, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
