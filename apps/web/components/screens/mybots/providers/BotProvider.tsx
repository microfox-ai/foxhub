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
  useMemo,
} from "react";
import useSWR from "swr";
import { ClientSecret } from "@prisma/client";
import {
  ClientSecretApiType,
  ClientSecretPackageType,
  ClientSecretVariable,
  ClientSecretWithPackageInfo,
  PackageStatus,
} from "@/server/types";
import { Constructor, Package } from "../../Chat/message/types";
import { useSearchParams } from "next/navigation";

const mapClientSecretToBot = (d: ClientSecretWithPackageInfo): Bot => ({
  ...d,
  image: (d.botConfig as any[]).find(
    (c: ClientSecretVariable) => c?.ui?.type === "image"
  )?.value as string,
  botConfigMapped: (d.botConfig as any[]).reduce(
    (acc, curr: ClientSecretVariable) => {
      acc[curr.key] = curr.value;
      return acc;
    },
    {} as Record<string, any>
  ),
  defaultConfig:
    (d.packageInfo?.constructors.find(
      (c: Constructor) =>
        c.auth.toLowerCase() === ClientSecretPackageType.APIKEY
    )?.botConfig as any[]) ?? [],
})

interface Bot extends ClientSecretWithPackageInfo {
  botConfigMapped: Record<string, any>;
  defaultConfig: ClientSecretVariable[];
  image?: string;
}

const useBotsCOntext = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const { selectedProject } = useClientProject();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");
  const packageName = searchParams.get("package");


  // Fetch stable packages info
  const { data: stablePackages, error: stablePackagesError } = useSWR(
    `/api/packages/infos?packageTypes=${PackageStatus.STABLE},${PackageStatus.SEMISTABLE}`,
    async (url: string) => {
      const response = await fetch(url);
      return response.json();
    }
  );
  const stableBotPackages =
    stablePackages?.filter((pkg: any) =>
      pkg.constructors.some(
        (constructor: Constructor) =>
          constructor.auth.toLowerCase() === ClientSecretPackageType.APIKEY
      )
    ) ?? [];

  const { data: currentBot, mutate: refreshBotToEdit } = useSWR<{ clientSecrets: ClientSecretWithPackageInfo[] }>(
    botId
      ? `/api/client-secrets?id=${botId}&withPackageInfos=true`
      : null,
    async (url: string) => {
      const response = await PortalSdk.getData(url, {});
      return response;
    }
  );

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
      setBots(
        selectedProjectSecretsData.clientSecrets.map(mapClientSecretToBot)
      );
    }
  }, [selectedProjectSecretsData]);


  const mode = botId === undefined || botId === null ? "create" : "edit";

  const botToEdit = useMemo(() => {
    let _botToEdit: any = mode === "edit" ? currentBot?.clientSecrets?.[0] : null;
    if (_botToEdit) {
      return mapClientSecretToBot(_botToEdit);
    }
    return null;
  }, [currentBot, mode]);


  const packageInfo =
    mode === "create"
      ? stableBotPackages.find((pkg: Package) => pkg.name === packageName)
      : botToEdit?.packageInfo;
  const selectedConstructor =
    mode === "create"
      ? packageInfo?.constructors[0]
      : botToEdit?.packageInfo?.constructors[0];

  return {
    bots,
    setBots,
    isLoading,
    error: error || stablePackagesError,
    stableBotPackages,
    refreshBots,
    botId,
    botToEdit,
    packageInfo,
    selectedConstructor,
    refreshBotToEdit,
  };
};

const BotContext = createContext<ReturnType<typeof useBotsCOntext> | undefined>(
  undefined
);

export function BotProvider({ children }: { children: ReactNode }) {
  const context = useBotsCOntext();

  return <BotContext.Provider value={context}>{children}</BotContext.Provider>;
}

export function useBots() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error("useBots must be used within a BotProvider");
  }
  return context;
}
