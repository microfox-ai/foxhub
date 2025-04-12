import { BotProvider } from "@/components/screens/mybots/providers/BotProvider";
import { Bot } from "lucide-react";

export default function MyBotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BotProvider>
      <div className="overflow-hidden p-4">
        <div className="mb-6 border-b border-neutral-200 pb-4">
          <h1 className="text-2xl flex items-center font-semibold text-neutral-900">
            <div className="flex items-center border border-neutral-200 justify-center w-10 h-10 rounded-full">
              <Bot className="w-6 h-6 " />
            </div>
            <span className="ml-2">My Bots</span>
          </h1>
        </div>
        {children}
      </div>
    </BotProvider>
  );
}
