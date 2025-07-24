import React from "react";
import { ChevronLeft } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useMessageParts } from "../../MessageProvider";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipContent } from "@/components/ui/tooltip";
import useSWR from "swr";
import { Package } from "../types";
import { AgentInfo } from "@microfox/types";
import { parseMcpType } from "@/components/screens/Chat/message/uiTool/mappers/uiHitl";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";

export const StepBanner = () => {
    const { status } = useMicrofoxChat();
    const { activePart, setActivePart, displayParts, message, setActivePartByToolCallId } = useMessageParts();

    const lastPartIndex = displayParts ? displayParts.length - 1 : -1;

    const hasPendingHumanIntervention = message?.parts?.some(p => {
        if (p.type?.startsWith("tool-") && (p as any).output) {
            try {
                // p.output can be a stringified JSON
                const output = typeof (p as any).output === 'string' ? JSON.parse((p as any).output) : (p as any).output;
                return output?._humanIntervention === true;
            } catch (error) {
                // Not a valid JSON, so it can't have _humanIntervent
                return false;
            }
        }
        return false;
    });

    const lastPart = displayParts[lastPartIndex];
    const lastPartIsSummary = lastPart?.type.match(/summary/i) || lastPart?.type === "text";
    const hasFinalSummary = lastPartIndex !== -1 && lastPartIsSummary && !hasPendingHumanIntervention && status !== "streaming";
    const isFinalSummaryActive = hasFinalSummary && activePart === lastPartIndex;

    const toolPackages = message?.parts?.map((p) => {
        const { mcpType, mcpName, toolName } = parseMcpType(p.type as `tool-${string}`);
        if (mcpType === "") {
            return null;
        }
        return {
            mcpName,
            mcpType,
            packageName: mcpName?.startsWith("@microfox") ? mcpName : `@microfox/${mcpName}`, toolName, ...p
        };
    }).filter((p) => p !== null);

    const packageNames = toolPackages.filter((p) => p.packageName && p.mcpType === "pkg").map((p) => p.packageName).join(",");
    const agentNames = toolPackages.filter((p) => p.packageName && p.mcpType === "agent").map((p) => p.mcpName).join(",");

    const { data: packageInfos, mutate: mutatePackageInfos } = useSWR<Package[]>(
        packageNames ? `/api/packages/infos?packageNames=${packageNames}` : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        }, {
        revalidateOnFocus: false,
    });

    const { data: agentInfos, mutate: mutateAgentInfos } = useSWR<AgentInfo[]>(
        `/api/agents/infos?agentNames=${agentNames}`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch agents");
            return res.json();
        }, {
        revalidateOnFocus: false,
    });

    return (
        <div className="flex mb-4 border-b border-neutral-200 gap-1 bg-transparent items-center sticky bg-white z-10 top-[0px] shadow-xs">
            <ChevronLeft
                className={`h-4 w-4 text-gray-500 cursor-pointer ${activePart > 0 ? "opacity-100" : "opacity-50"
                    }`}
                onClick={() => {
                    if (activePart > 0) {
                        setActivePart(activePart - 1)
                    }
                }}
            />
            <div
                className={`text-xs align-items-center p-0 bg-transparent hover:text-black cursor-pointer line-height-[0.5em]`}
            >
                Step {activePart + 1}
            </div>
            <ChevronRight
                className={`h-4 w-4 text-gray-500 cursor-pointer ${activePart < (displayParts?.length ?? 0) - 1
                    ? "opacity-100"
                    : "opacity-50"
                    }`}
                onClick={() => {
                    if (displayParts && activePart < displayParts.length - 1) {
                        setActivePart(activePart + 1)
                    }
                }}
            />
            <div className="flex flex-row items-center gap-2 px-2">
                {toolPackages.map((p, _index) => {
                    const mcpType = p.mcpType;
                    const isActivePart = (p as any).toolCallId === (displayParts[activePart] as any)?.toolCallId;
                    const packageInfo = packageInfos?.find((pi) => pi.name === p.packageName);
                    const agentInfo = agentInfos?.find((ai) => ai.agentName === p.mcpName);
                    const icon = mcpType === "pkg" ? packageInfo?.icon : agentInfo?.iconUrl;
                    const title = mcpType === "pkg" ? packageInfo?.name : agentInfo?.title;
                    return (
                        <React.Fragment key={p.type + _index}>
                            <div
                                onClick={() => {
                                    setActivePartByToolCallId((p as any).toolCallId);
                                }}
                                className={`flex items-center gap-2 cursor-pointer py-1 ${isActivePart ? "border-b-2 border-black" : ""
                                    }`}
                            >
                                <Tooltip>
                                    <TooltipTrigger>
                                        <img src={icon} alt={title} className="w-4 h-4 rounded-full" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {p.toolName} in {title}
                                    </TooltipContent>
                                </Tooltip>
                                {isActivePart && (
                                    <span className="text-md font-medium text-neutral-800">{p.toolName}</span>
                                )}
                            </div>
                            {_index !== toolPackages.length - 1 && (
                                <ChevronRight className="w-3 h-3" />
                            )}
                        </React.Fragment>
                    )
                })}
                {hasFinalSummary && (
                    <>
                        {toolPackages.length > 0 && (
                            <ChevronRight className="w-3 h-3 text-neutral-400 self-center" />
                        )}
                        <div
                            onClick={() => {
                                if (displayParts) {
                                    setActivePart(displayParts.length - 1);
                                }
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <span
                                className={`text-md py-1 ${isFinalSummaryActive
                                    ? "text-neutral-800 border-b-2 border-black font-medium"
                                    : "text-neutral-500"
                                    }`}
                            >
                                {isFinalSummaryActive ? "Final Summary" : "Final"}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}