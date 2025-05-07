import { BotHeader } from "@/components/screens/mybots/BotHeader";
import { BotProvider } from "@/components/screens/mybots/providers/BotProvider";
import { SecretProvider } from "@/components/screens/mybots/providers/SecretProvider";
import { SecretFormProvider } from "@/components/screens/mybots/providers/SecretFormProvider";
import { Bot } from "lucide-react";

export default function MyBotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SecretProvider>
      <BotProvider>
        <SecretFormProvider>
          <div className="">
            <BotHeader />
            {children}
          </div>
        </SecretFormProvider>
      </BotProvider>
    </SecretProvider>
  );
}
