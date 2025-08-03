/* eslint-disable @next/next/no-img-element */
"use client";
import { useBots } from "./providers/BotProvider";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { BotsCardsGrid } from "./BotsCardsGrid";
import { BotsTableList } from "./BotsTableList";

const MyBots = ({ uiType = "bots" }: { uiType?: "bots" | "connections" }) => {

  const { error } = useBots();

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
    <TooltipProvider>
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
      <div className="">
        {uiType === "bots" ? (
          <BotsCardsGrid />
        ) : (
          <BotsTableList />
        )}
      </div>
    </TooltipProvider>
  );
};

export default MyBots;
