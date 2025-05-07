/* eslint-disable @next/next/no-img-element */
"use client";

import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import AddBotDialog from "./AddBotDialog";
import { useBots } from "./providers/BotProvider";
import { useRouter } from "next/navigation";

const MyBots = () => {
  const [isAddBotDialogOpen, setIsAddBotDialogOpen] = useState(false);
  const { bots, isLoading, error, stableBotPackages } = useBots();
  const router = useRouter();

  const handleAddBot = () => {
    setIsAddBotDialogOpen(true);
  };

  const handleBotClick = (botId: string) => {
    router.push(`/my-bots/edit?botId=${botId}`);
  };

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

  return (
    <div className="grid mt-8 px-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
      {/* Add Bot Card */}
      <div className="flex flex-col items-center">
        <button
          onClick={handleAddBot}
          className="w-full aspect-square flex items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-8 w-8 text-gray-400" />
        </button>
        <span className="mt-3 text-sm font-medium text-gray-600">New Bot</span>
      </div>

      {isLoading
        ? [1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="w-full aspect-square rounded-3xl" />
            <Skeleton className="mt-3 h-4 w-16" />
          </div>
        ))
        : bots.map((bot) => (
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
              <div className="absolute top-4 left-4 bg-white/80 rounded-full p-1">
                <img
                  src={bot.packageInfo?.icon ?? "/default-bot-platform.png"}
                  alt={bot.packageInfo?.name}
                  className="w-8 h-8 p-1 object-contain"
                />
              </div>
            </div>
            <span className="mt-3 text-sm text-center text-neutral-700">
              {bot?.name}
            </span>
          </div>
        ))}

      <AddBotDialog
        isOpen={isAddBotDialogOpen}
        onOpenChange={setIsAddBotDialogOpen}
        stableBotPackages={stableBotPackages}
      />
    </div>
  );
};

export default MyBots;
