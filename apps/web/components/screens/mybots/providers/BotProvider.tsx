"use client";

import { PortalSdk } from "@/utils/services/PortalSdk";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import useSWR from "swr";
import {
  ClientSecretPackageType,
  ClientSecretWithPackageInfo,
  PackageStatus,
} from "@/server/types";
import { Constructor, Package } from "../../Chat/message/types";
import { useSearchParams } from "next/navigation";
import { useSecret } from "./SecretProvider";
import { Bot, mapClientSecretToBot } from "./types";

const useBotsContextInternal = (packageTypes?: ClientSecretPackageType[]) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const { selectedProject } = useClientProject();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const packageName = searchParams?.get("package");
  const _botId = searchParams?.get("botId");

  const { botToEdit, mode, refreshBotToEdit, botId, setBotId, isLoadingBotToEdit } = useSecret();

  useEffect(() => {
    if (_botId) {
      setBotId(_botId);
    }
    else {
      setBotId(null);
    }
  }, [_botId, setBotId]);

  const { data: stablePackages, error: stablePackagesError } = useSWR(
    `/api/packages/infos?packageTypes=${PackageStatus.STABLE},${PackageStatus.EXTERNAL}`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch stable packages');
      }
      return response.json();
    }
  );
  const stableBotPackages =
    stablePackages?.filter((pkg: any) =>
      pkg.constructors.some(
        (constructor: Constructor) =>
          constructor.auth?.toLowerCase() === ClientSecretPackageType.APIKEY
      )
    ) ?? [];

  // FOR LIST OUT OF ALL APIKEY BASED BOTS
  const {
    data: selectedProjectSecretsData,
    error: projectSecretsError,
    isLoading,
    mutate: refreshBots,
  } = useSWR<{ clientSecrets: ClientSecretWithPackageInfo[] }>(
    selectedProject?.id && user?.id
      ? `/api/client-secrets?botProjectId=${selectedProject?.id}&userId=${user?.id}&withPackageInfos=true&packageTypes=${packageTypes?.join(",")}`
      : null,
    async (url: string) => {
      const response = await PortalSdk.getData(url, {});
      return response;
    }
  );

  useEffect(() => {
    if (selectedProjectSecretsData?.clientSecrets) {
      setBots(
        selectedProjectSecretsData.clientSecrets?.filter((secret) => secret.templateId == undefined).map(mapClientSecretToBot)
      );
    }
  }, [selectedProjectSecretsData]);

  return {
    bots,
    setBots,
    isLoading,
    error: projectSecretsError || stablePackagesError,
    stableBotPackages,
    refreshBots,
    botId,
    botToEdit,
    refreshBotToEdit,
    mode,
    isLoadingBotToEdit,
  };
};

const BotContext = createContext<ReturnType<typeof useBotsContextInternal> | undefined>(
  undefined
);

export function BotProvider({ children, packageTypes }: { children: ReactNode, packageTypes?: ClientSecretPackageType[] }) {
  const context = useBotsContextInternal(packageTypes);

  return <BotContext.Provider value={context}>{children}</BotContext.Provider>;
}

export function useBots() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error("useBots must be used within a BotProvider");
  }
  return context;
}
