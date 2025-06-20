/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import AddBotDialog from "./AddBotDialog";
import { useBots } from "./providers/BotProvider";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Identity } from "@microfox/oauth-kit";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MyBots = () => {
  const [isAddBotDialogOpen, setIsAddBotDialogOpen] = useState(false);
  const { bots, isLoading, error, stableBotPackages } = useBots();
  const router = useRouter();
  const pathname = usePathname();

  const handleAddBot = () => {
    setIsAddBotDialogOpen(true);
  };

  const handleBotClick = (botId: string) => {
    router.push(`${pathname}/edit?botId=${botId}`);
  };

  console.log("bots", bots);


  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Error loading bots
          </h2>
          <p className="text-gray-500">Please try again later</p>
        </div>
      </div>
    );
  }

  if (pathname?.includes("my-data") && bots.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-600">No Connections found</h2>
          <p className="text-gray-500">You can make connections as you use the app.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
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

        {/* {pathname?.includes("my-data") && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleAddBot}
              className="w-full aspect-square flex items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-8 w-8 text-gray-400" />
            </button>
            <span className="mt-3 text-sm font-medium text-gray-600">New Connection</span>
          </div>
        )} */}

        {isLoading
          ? [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="w-full aspect-square rounded-3xl" />
              <Skeleton className="mt-3 h-4 w-16" />
            </div>
          ))
          : bots.map((bot) => {
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

        <AddBotDialog
          isOpen={isAddBotDialogOpen}
          onOpenChange={setIsAddBotDialogOpen}
          stableBotPackages={stableBotPackages}
        />
      </div>
    </TooltipProvider>
  );
};

export default MyBots;
