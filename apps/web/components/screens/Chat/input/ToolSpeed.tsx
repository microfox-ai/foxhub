import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion"
import { PyramidIcon, Zap } from "lucide-react"
import { useMicrofoxChat } from "../MicrofoxChatProvider"
import { MinionFlow } from "../../hooks/convertors"


const speedTabs = [
    {
        value: "fast",
        label: "Fast Action",
        icon: <Zap />
    },
    {
        value: "deep",
        label: "Deep Think",
        icon: <PyramidIcon />
    },
]


export const ToolSpeed = () => {
    const { lastKnownMinionFlow, toolMode, setToolMode } = useMicrofoxChat();

    if (lastKnownMinionFlow != MinionFlow.ChatFlow) {
        return null;
    }

    return (
        <TooltipProvider>
            <TabsList className="relative flex bg-gray-100 p-[3px] h-11 rounded-lg">
                {speedTabs.map((tab) => (
                    <Tooltip key={`tab-tooltip-${tab.value}`}>
                        <TooltipTrigger asChild>
                            <TabsTrigger
                                value={tab.value}
                                onClick={() => setToolMode(tab.value as "fast" | "deep")}
                                className="relative duration-300 !shadow-none h-9 data-[state=active]:bg-transparent data-[state=active]:shadow-none z-10 flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-600 rounded-lg transition-all"
                            >
                                <motion.div
                                    className="flex items-center gap-2"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    {tab.icon}
                                </motion.div>
                                {toolMode === tab.value && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -z-[1] inset-0 bg-white rounded-lg"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tab.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TabsList>
        </TooltipProvider>
    )
}