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
import { ClientSecretApiType, ClientSecretPackageType, ClientSecretVariable, ClientSecretWithPackageInfo, PackageStatus } from "@/server/types";
import { Constructor } from "../../Chat/message/types";

interface Bot extends ClientSecretWithPackageInfo {
  botConfigMapped: Record<string, any>;
  defaultConfig: ClientSecretVariable[];
  image?: string;
}

const useBotsCOntext = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const { selectedProject } = useClientProject();
  const { user } = useUser();

  // Fetch stable packages info
  const { data: stablePackages, error: stablePackagesError } = useSWR(
    `/api/packages/infos?packageTypes=${PackageStatus.STABLE},${PackageStatus.SEMISTABLE}`,
    async (url: string) => {
      const response = await fetch(url);
      return response.json();
    }
  );
  const stableBotPackages = stablePackages
    ?.filter(
      (pkg: any) => pkg.constructors.some((constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.APIKEY
      )) ?? [];

  // Fetch project secrets
  const {
    data: selectedProjectSecretsData,
    error,
    isLoading,
    mutate: refreshBots,
  } = useSWR<{ clientSecrets: ClientSecretWithPackageInfo[] }>(
    selectedProject?.id && user?.id
      ? `/api/client-secrets?botProjectId=${selectedProject?.id}&userId=${user?.id}&withPackageInfos=true&packageTypes=${ClientSecretPackageType.APIKEY}`
      : null,
    async (url: string) => {
      const response = await PortalSdk.getData(url, {});
      return response;
    }
  );

  useEffect(() => {
    if (selectedProjectSecretsData?.clientSecrets) {
      setBots(selectedProjectSecretsData.clientSecrets.map((d) => ({
        ...d,
        image: (d.botConfig as any[]).find((c: ClientSecretVariable) => c?.ui?.type === "image")?.value as string,
        botConfigMapped: (d.botConfig as any[]).reduce((acc, curr: ClientSecretVariable) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, any>),
        defaultConfig: (d.packageInfo?.constructors.find((c: Constructor) => c.auth.toLowerCase() === ClientSecretPackageType.APIKEY)?.botConfig as any[]) ?? [],
      })));
    }
  }, [selectedProjectSecretsData]);

  return {
    bots,
    setBots,
    isLoading,
    error: error || stablePackagesError,
    stableBotPackages,
    refreshBots,
  }
}


const BotContext = createContext<ReturnType<typeof useBotsCOntext> | undefined>(undefined);

export function BotProvider({ children }: { children: ReactNode }) {
  const context = useBotsCOntext();

  return (
    <BotContext.Provider
      value={context}
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
