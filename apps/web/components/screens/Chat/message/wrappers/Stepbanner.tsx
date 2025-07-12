import { ChevronLeft } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useMessageParts } from "../../MessageProvider";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipContent } from "@/components/ui/tooltip";
import useSWR from "swr";
import { Package } from "../types";
import { parseMcpType } from "@/server/ui/uiHitl";

export const StepBanner = () => {
    const { activePart, setActivePart, displayParts, message, setActivePartByToolCallId } = useMessageParts();
    const toolPackages = message?.parts?.map((p) => {
        const { mcpType, mcpName, toolName } = parseMcpType(p.type as `tool-${string}`);
        if (mcpType === "pkg") {
            return { packageName: mcpName?.startsWith("@microfox") ? mcpName : `@microfox/${mcpName}`, toolName, ...p };
        }
        return null;
    }).filter((p) => p !== null);

    const packageNames = toolPackages.map((p) => p.packageName).join(",");

    const { data: packageInfos, mutate: mutatePackageInfos } = useSWR<Package[]>(
        packageNames ? `/api/packages/infos?packageNames=${packageNames}` : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        }, {
        revalidateOnFocus: false,
    });

    return (
        <div className="flex gap-1 mb-3 bg-transparent align-items-center">
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
                className={`h-4 w-4 text-gray-500 cursor-pointer ${activePart < displayParts?.length - 1
                    ? "opacity-100"
                    : "opacity-50"
                    }`}
                onClick={() => {
                    if (activePart < displayParts?.length - 1) {
                        setActivePart(activePart + 1)
                    }
                }}
            />
            <div className="flex flex-row gap-2 border border-neutral-200 rounded-xl px-2 -mt-1">
                {toolPackages.map((p, _index) => {
                    const packageInfo = packageInfos?.find((pi) => pi.name === p.packageName);
                    return (
                        <div
                            onClick={() => {
                                setActivePartByToolCallId((p as any).toolCallId);
                            }}
                            key={p.type + _index} className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger>
                                    <img src={packageInfo?.icon} alt={packageInfo?.name} className="w-4 h-4 rounded-full" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    {p.toolName} in {packageInfo?.title}
                                </TooltipContent>
                            </Tooltip>
                            {_index === toolPackages.length - 1 && (
                                <span className="text-sm text-neutral-500">{p.toolName}</span>
                            )}
                            {_index !== toolPackages.length - 1 && (
                                <ChevronRight className="w-3 h-3" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}