import { Skeleton } from "@mui/material";
import { useBots } from "./providers/BotProvider";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Plus } from "lucide-react";
import { Identity } from "@microfox/oauth-kit";
import { usePathname, useRouter } from "next/navigation";


export const BotsCardsGrid = () => {

    const router = useRouter();
    const pathname = usePathname();

    const handleBotClick = (botId: string) => {
        router.push(`${pathname}/edit?botId=${botId}`);
    };

    const handleAddBot = () => {
        router.push(`${pathname}/create`);
    };

    const { bots, isLoading, error, stableBotPackages } = useBots();

    console.log("bots", bots);

    if (isLoading) {
        return (
            <>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                        <Skeleton className="w-full aspect-square rounded-3xl" />
                        <Skeleton className="mt-3 h-4 w-16" />
                    </div>
                ))}
            </>
        )
    }
    return (
        <div className="grid mt-8 px-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
            {/* Add Bot Card */}
            {pathname?.includes("my-bots") && (
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleAddBot}
                        className="w-full aspect-square flex items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                        <Plus className="h-8 w-8 text-gray-400" />
                    </button>
                    <span className="mt-3 text-sm font-medium text-gray-600">New Bot</span>
                </div>
            )}

            {bots.map((bot) => {
                const identity = bot.identityMetadata as any as Identity
                return (
                    <div
                        key={bot.name}
                        onClick={() => handleBotClick(bot.id)}
                        className="flex relative flex-col items-center cursor-pointer bg-neutral-100 hover:translate-y-[-4px] hover:bg-neutral-200 hover:shadow-lg transition-all duration-200 p-2 rounded-2xl"
                    >
                        <div className="w-full aspect-square rounded-3xl p-1 bg-white overflow-hidden">
                            <img
                                src={bot?.image ?? bot?.botConfigMapped?.botImage ?? "/images/default-bot-avatar.png"}
                                alt={bot.botConfigMapped?.botName}
                                className="w-full h-full object-cover"
                            />
                            <Tooltip>
                                <TooltipTrigger popover="auto" asChild>
                                    <div className="absolute top-4 left-4 bg-white/80 rounded-full p-1 flex items-center justify-center">

                                        <img
                                            src={bot.packageInfo?.icon ?? "/default-bot-platform.png"}
                                            alt={bot.packageInfo?.name}
                                            className="w-6 h-6 p-1 object-contain rounded-full"
                                        />
                                        {identity?.userInfo && (
                                            <>
                                                <ChevronRight className="w-4 h-4" />
                                                <img
                                                    src={identity?.userInfo?.avatarUrl ?? "/default-bot-platform.png"}
                                                    alt={bot.packageInfo?.name}
                                                    className="w-6 h-6 p-1 object-contain rounded-full"
                                                />
                                            </>
                                        )}
                                        {identity?.teamInfo && (
                                            <>
                                                <ChevronRight className="w-4 h-4" />
                                                <img
                                                    src={identity?.teamInfo?.icon ?? "/default-bot-platform.png"}
                                                    alt={bot.packageInfo?.name}
                                                    className="w-6 h-6 p-1 object-contain rounded-full"
                                                />
                                            </>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-[200px]">{identity?.teamInfo?.name ?? identity?.userInfo?.name} {bot.packageInfo?.title} was connected by {identity?.userInfo?.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <span className="mt-3 text-sm text-center text-neutral-700 line-clamp-2">
                            {identity?.teamInfo?.name ?? identity?.userInfo?.name} {bot?.packageInfo?.title}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}