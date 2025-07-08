"use client";

import { HitlAuthObject } from "@/server/ui/uiTool";
import { ClientSecret } from "@prisma/client";
import {
    createContext,
    useContext,
    ReactNode,
    useState,
    Dispatch,
    SetStateAction,
} from "react";
import { useMicrofoxChat } from "../../../MicrofoxChatProvider";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { fetchSecretVariables, removeVariables, replaceVariables } from "@/server/toolfox/helpers/fetchVariables";

type HitlContextType = ReturnType<typeof useHitlContext>;

const HitlContext = createContext<HitlContextType | undefined>(undefined);

function useHitlContext() {

    const { addToolResult } = useMicrofoxChat();
    const { selectedRequest } = useClientProject();
    const [auth, setAuth] = useState<HitlAuthObject | undefined>(undefined);

    const selectSecret = (secret: ClientSecret, packageName: string) => {
        setAuth((as) => {
            if (!as) return undefined;
            const newAuthSecrets = [...as?.secrets ?? []];
            const index = newAuthSecrets.findIndex((s) => s.packageName === packageName);
            let updatedVariables = as?.variables ? as.variables : [];
            if (index !== -1 && newAuthSecrets[index]) {
                // first remove the variables of the old secret
                // const oldSecret = newAuthSecrets[index].secrets.find((s) => s.id === newAuthSecrets[index]?.selectedSecretId);
                // if (oldSecret) {
                //     updatedVariables = removeVariables(updatedVariables, oldSecret);
                // }
                // // next carefully add the new variables (while overwriting if any)
                // updatedVariables = replaceVariables(updatedVariables, secret);
                newAuthSecrets[index] = {
                    ...newAuthSecrets[index],
                    packageName,
                    selectedSecretId: secret.id,
                };
            }
            return {
                ...as,
                secrets: newAuthSecrets,
                //variables: updatedVariables,
            };
        })
    }

    const addHitlToolResult = (toolResult: any) => {
        console.log("addHitlToolResult", toolResult, "stateAuth", auth);
        addToolResult({
            ...toolResult,
            output: {
                ...toolResult.output,
                auth: {
                    ...toolResult.output.auth,
                    ...auth,
                },
            },
        });
    }

    const refetchHitlAuth = () => {
        PortalSdk.postData("/api/client-secrets/hitl-auth", {
            authOptions: {
                packages: auth?.secrets.map((s) => ({
                    packageName: s.packageName,
                    packageConstructor: s.packageConstructor,
                })),
                //customSecrets: auth?.
            },
            clientRequestId: selectedRequest?.id,
            userId: selectedRequest?.userId,
        }).then((res) => {
            setAuth(res);
        }).catch((err) => {
            console.error("Error fetching secrets", err);
        });
    }

    return {
        auth,
        selectSecret,
        setAuth,
        addHitlToolResult,
        refetchHitlAuth,
    };
}

export function useHitl() {
    const context = useContext(HitlContext);
    if (context === undefined) {
        throw new Error("useHitl must be used within a HitlProvider");
    }
    return context;
}

interface HitlProviderProps {
    children: ReactNode;
}

export function HitlProvider({ children }: HitlProviderProps) {
    const value = useHitlContext();
    return <HitlContext.Provider value={value}>{children}</HitlContext.Provider>;
}
