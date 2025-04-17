"use client";

import { PortalSdk } from "@/utils/services/PortalSdk";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useUser } from "@/utils/hooks/useUser";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import useSWR from "swr";
import { ClientSecret } from "@prisma/client";

interface Bot {
  botName: string;
  botImage: string;
  botPackageName: string;
  savedBotConfig: any;
  botInfoInDb: ClientSecret;
  botConfig: any;
  otherInfos: any;
}

interface BotContextType {
  bots: Bot[];
  isLoading: boolean;
  error: any;
  nonOauthPackages: any[];
  refreshBots: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export function BotProvider({ children }: { children: ReactNode }) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [nonOauthPackages, setNonOauthPackages] = useState<any[]>([]);
  const { selectedProject } = useClientProject();
  const { user } = useUser();

  // Fetch stable packages info
  const { data: stablePackages, error: stablePackagesError } = useSWR(
    "/api/packages/get-stable-package-info",
    async (url: string) => {
      const response = await fetch(url);
      return response.json();
    }
  );

  // Fetch project secrets
  const {
    data: selectedProjectSecrets,
    error,
    isLoading,
    mutate: refreshBots,
  } = useSWR(
    selectedProject?.id && user?.id
      ? `/api/client-secrets/project-secrets?projectId=${selectedProject?.id}&userId=${user?.id}`
      : null,
    async (url: string) => {
      const response = await PortalSdk.getData(url, {});
      return response;
    }
  );

  // Filter non-oauth packages when stable packages are loaded
  useEffect(() => {
    if (stablePackages) {
      const filteredPackages = stablePackages.filter((pkg: any) => {
        return pkg.constructors.some(
          (constructor: any) => constructor.auth !== "oauth2"
        );
      });
      setNonOauthPackages(filteredPackages);
    }
  }, [stablePackages]);

  // Get package info for each bot
  useEffect(() => {
    const getPackageInfos = async () => {
      if (!selectedProjectSecrets) return;

      const packageInfosPromises = selectedProjectSecrets.map(
        async (secret: any) => {
          const packageName = (secret.type as string).split("/")[1];
          const constructorName = (secret.type as string).split("/")[2];
          const packageUrl = `/api/client-secrets/with-infos?packageName=${packageName}`;
          const response = await fetch(packageUrl);
          const packageInfo = await response.json();
          const nonOauthType = packageInfo.constructors.find(
            (constructor: any) =>
              constructor.auth !== "oauth2" &&
              constructor.name === constructorName
          );

          if (!nonOauthType) {
            return null;
          }

          return {
            botName: secret.name,
            botInfoInDb: secret,
            botImage: packageInfo.icon,
            botPackageName: packageInfo.name,
            savedBotConfig: secret?.botConfig || null,
            botConfig: nonOauthType.botConfig,
            otherInfos: packageInfo,
          };
        }
      );

      const packageInfos = await Promise.all(packageInfosPromises);
      setBots(packageInfos.filter((bot): bot is Bot => bot !== null));
    };

    getPackageInfos();
  }, [selectedProjectSecrets]);

  return (
    <BotContext.Provider
      value={{
        bots,
        isLoading,
        error: error || stablePackagesError,
        nonOauthPackages,
        refreshBots,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBots() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error("useBots must be used within a BotProvider");
  }
  return context;
}
