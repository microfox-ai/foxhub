import { ClientSecretPackageType, ClientSecretVariable } from "@/server/types";
import { TaskIntegrationPlatform } from "@/server/convertfox/types";
import { ClientSecret, CLIENTSECRETSTATUS } from "@prisma/client";
import { Constructor, KeyVariableConfig } from "../types";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useParams } from "next/navigation";
import { KeyedMutator } from "swr";
import { CheckCircle2 } from "lucide-react";


export const OAuthButton = ({ packageInfo, secretsData, mutateSecrets }: {
    packageInfo: any,
    secretsData?: {
        clientSecrets: ClientSecret[],
    },
    mutateSecrets: KeyedMutator<{
        clientSecrets: ClientSecret[];
    }>
}) => {

    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;
    const { user } = useUser();
    const [connecting, setConnecting] = useState<Record<string, boolean>>({});
    const constructor: Constructor = packageInfo?.constructors.find((c: Constructor) => c.auth === "oauth2");

    const handleConnect = async (packageInfo: any, authEndpoint: string) => {
        try {
            setConnecting((prevState: Record<string, boolean>) => ({
                ...prevState,
                [packageInfo.name]: true,
            }));

            // Create empty DB client secret doc
            const data = await PortalSdk.postData(`/api/client-secrets`, {
                clientRequestId: requestParamId,
                botProjectId: projectParamId,
                name: packageInfo?.title,
                packageName: packageInfo?.name,
                packageConstructor: constructor?.name,
                packageType: ClientSecretPackageType.OAUTH2,
                userId: user?.id,
                status: CLIENTSECRETSTATUS.EMPTY,
                botConfig: [],
                variables: [
                    ...constructor.internalKeys
                        .map((key: KeyVariableConfig) => ({
                            key: key.key,
                            value: key.defaultValue ? Array.isArray(key.defaultValue) ? key.defaultValue.join(",") : key.defaultValue : "",
                            isOptional: false,
                        }))
                ] as ClientSecretVariable[],
                addToClientRequest: true,
            });

            document.cookie = `${authEndpoint.replace(/^\//, "")}=${data.id}; path=/; SameSite=Lax`;
            localStorage.setItem(authEndpoint.replace(/^\//, ""), data.id);

            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;

            window.open(authEndpoint, "_blank", features);
        } catch (error) {
            console.error("Error connecting:", error);
        } finally {
            setConnecting((prevState: Record<string, boolean>) => ({
                ...prevState,
                [packageInfo.name]: false,
            }));
        }
    };


    const oauthConstructor = packageInfo?.constructors.find((c: Constructor) => c.auth === "oauth2");
    const oauthSecret = secretsData?.clientSecrets?.find((secret) =>
        secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
    );
    const authEndpoint = packageInfo?.constructors.find((c: Constructor) => c.auth === "oauth2")?.authEndpoint
        ?? packageInfo?.authEndpoint;

    const hasAllAuthRelatedKeys = oauthSecret
        ? (oauthSecret?.variables as any[]).every((variable: ClientSecretVariable) =>
        (
            variable.value?.trim() !== "" &&
            oauthConstructor?.internalKeys.some((key: KeyVariableConfig) => {
                if (variable.key === "SCOPES") return true;
                return key.key === variable.key;
            })
        )
        )
        : false;



    return (
        <div className="relative">
            {hasAllAuthRelatedKeys ? (
                <Button
                    variant="outline"
                    size="sm"
                    className=" h-8 px-3 text-xs font-medium bg-white text-black"
                    onClick={() =>
                        handleConnect(packageInfo, authEndpoint)
                    }
                    disabled={connecting[packageInfo.name]}
                >
                    Connected
                </Button>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs font-medium"
                    onClick={() =>
                        handleConnect(packageInfo, authEndpoint)
                    }
                    disabled={connecting[packageInfo.name]}
                >
                    {connecting[packageInfo.name]
                        ? "Connecting..."
                        : "Connect"}

                </Button>
            )}
            {!hasAllAuthRelatedKeys ? (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400" />
            ) : (
                <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-4 w-4 rounded-full text-green-500" />
            )}
        </div>
    )
}