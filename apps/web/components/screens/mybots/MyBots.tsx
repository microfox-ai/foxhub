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
  const { bots, isLoading, error, nonOauthPackages } = useBots();
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
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
              key={bot.botName}
              onClick={() => handleBotClick(bot.botInfoInDb.id)}
              className="flex relative flex-col items-center cursor-pointer bg-neutral-100 hover:translate-y-[-4px] hover:bg-neutral-200 hover:shadow-lg transition-all duration-200 p-2 rounded-2xl"
            >
              <div className="w-full aspect-square rounded-3xl p-1 bg-white overflow-hidden">
                <img
                  src={bot.savedBotConfig?.image || bot.botImage}
                  alt={bot.botName}
                  className="w-full h-full object-contain"
                />
              </div>
              {bot.savedBotConfig && bot.savedBotConfig.length > 0 && (
                <div className="absolute border-2 p-1 rounded-full -top-2 -right-2">
                  <img
                    src={bot.botImage || "/default-bot-avatar.png"}
                    alt={bot.botName}
                    className="w-5 h-5 z-30 object-cover"
                  />
                </div>
              )}
              <span className="mt-3 text-sm text-center text-neutral-700">
                {bot.botName}
              </span>
            </div>
          ))}

      <AddBotDialog
        isOpen={isAddBotDialogOpen}
        onOpenChange={setIsAddBotDialogOpen}
        nonOauthPackages={nonOauthPackages}
      />
    </div>
  );
};

export default MyBots;
