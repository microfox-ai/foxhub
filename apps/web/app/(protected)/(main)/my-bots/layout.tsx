import { BotHeader } from "@/components/screens/mybots/BotHeader";
import { BotProvider } from "@/components/screens/mybots/providers/BotProvider";
import { SecretProvider } from "@/components/screens/mybots/providers/SecretProvider";
import { SecretFormProvider } from "@/components/screens/mybots/providers/SecretFormProvider";
import { ClientSecretPackageType } from "@/server/types";

export default function MyBotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SecretProvider>
      <BotProvider packageTypes={[ClientSecretPackageType.APIKEY]}>
        <SecretFormProvider>
          <div className="">
            <BotHeader type="bots" />
            {children}
          </div>
        </SecretFormProvider>
      </BotProvider>
    </SecretProvider>
  );
}
