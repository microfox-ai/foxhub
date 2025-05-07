"use client";

import { createContext, useContext, useMemo, ReactNode, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
    ClientSecretWithPackageInfo,
} from "@/server/types";
import { Bot, mapClientSecretToBot } from "./types";

const useSecretContextInternal = () => {
    const searchParams = useSearchParams();
    const [botId, setBotId] = useState<string | null>(null);

    const { data: currentBotData, mutate: refreshBotToEdit, isLoading: isLoadingBotToEdit } = useSWR<
        { clientSecrets: ClientSecretWithPackageInfo[] }
    >(
        botId ? `/api/client-secrets?id=${botId}&withPackageInfos=true` : null,
        async (url: string) => {
            const response = await PortalSdk.getData(url, {});
            return response;
        }
    );

    const mode = (botId === undefined || botId === null) ? "create" : "edit";

    const botToEdit = useMemo(() => {
        if (mode === "edit" && currentBotData?.clientSecrets?.[0]) {
            return mapClientSecretToBot(currentBotData.clientSecrets[0]);
        }
        return null;
    }, [currentBotData, mode]);

    return {
        botToEdit,
        refreshBotToEdit,
        mode: mode as "create" | "edit",
        botId,
        setBotId,
        isLoadingBotToEdit,
    };
};

const SecretContext = createContext<
    ReturnType<typeof useSecretContextInternal> | undefined
>(undefined);

export function SecretProvider({ children }: { children: ReactNode }) {
    const context = useSecretContextInternal();
    return (
        <SecretContext.Provider value={context}>{children}</SecretContext.Provider>
    );
}

export function useSecret() {
    const context = useContext(SecretContext);
    if (context === undefined) {
        throw new Error("useSecret must be used within a SecretProvider");
    }
    return context;
}
