import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { ActionButtons } from "./ActionButtons";
import { ApiKeyButton } from "../secrets/ApiKeyButton";
import { OAuthButton } from "../secrets/OAuthButton";
import { ClientSecret } from "@prisma/client";
import { Constructor, Package } from "../types";
import { TaskIntegrationPlatform } from "@/server/convertfox/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClientSecretApiType, ClientSecretPackageType, ClientSecretVariable } from "@/server/types";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface TaskIntegrationsProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const TaskIntegrations = ({
    uiAnnotation,
    idx,
}: TaskIntegrationsProps) => {
    const platforms = uiAnnotation.object.platforms as TaskIntegrationPlatform[];
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;

    const { data: secretsData, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        requestParamId
            ? `/api/client-secrets?clientRequestId=${requestParamId}`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch secrets");
            return res.json();
        },
        {
            revalidateOnFocus: true,
        }
    );
    const oauthSecrets = secretsData?.clientSecrets?.filter((secret) => secret.packageType === ClientSecretPackageType.OAUTH2);


    // Compute platform statuses using useMemo to avoid unnecessary recalculations
    const { platformKeyStatus, oauthStatus } = useMemo(() => {
        const keyStatus: Record<string, boolean> = {};
        const authStatus: Record<string, boolean> = {};

        platforms.forEach((platform) => {
            // Set default status for non-optional platforms
            if (!platform.optional) {
                keyStatus[platform.name] = false;
                authStatus[platform.name] = false;
            }
            // Check API Keys
            if (platform.packageInfo?.constructors.some((c: Constructor) => c.auth === "apiKey")) {
                const constructor = platform.packageInfo?.constructors.find((c: Constructor) => c.auth === "apiKey");
                const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
                    secret !== undefined && secret.packageName === platform.packageInfo?.name && secret.packageConstructor === constructor?.name
                );
                if (apiKeySecret && constructor && constructor.requiredKeys) {
                    keyStatus[platform.name] = apiKeySecret ? constructor.requiredKeys.every(
                        (keyInfo: ClientSecretVariable) =>
                            (apiKeySecret.variables as any[]).some(
                                (variable: ClientSecretVariable) =>
                                    variable.key === keyInfo.key && variable.value?.trim()
                            )
                    ) : false;
                }
            }
            // Check OAuth
            if (platform.packageInfo?.constructors.some((c: Constructor) => c.auth === "oauth2")) {
                const oauthConstructor = platform.packageInfo.constructors.find((c: Constructor) => c.auth === "oauth2");
                const oauthSecret = secretsData?.clientSecrets?.find((secret) =>
                    secret !== undefined && secret.packageName === platform.packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
                );
                if (oauthConstructor && oauthSecret && oauthConstructor.internalKeys) {
                    authStatus[platform.name] = oauthSecret
                        ? (oauthSecret.variables as any[]).every(
                            (variable: ClientSecretVariable) =>
                                variable.value?.trim() !== "" &&
                                oauthConstructor.internalKeys.some(
                                    (key: ClientSecretVariable) => key.key === variable.key
                                )
                        )
                        : false;
                }
            }
        });

        return { platformKeyStatus: keyStatus, oauthStatus: authStatus };
    }, [platforms, secretsData?.clientSecrets, oauthSecrets]);

    // Memoize the areKeysFilled check
    const areKeysFilled = useMemo(() => {
        return platforms.every((platform) => {
            // If platform is optional, skip the check
            if (platform.optional) return true;

            const requiresApiKey = platform.packageInfo?.constructors.some(
                (c: Constructor) => c.auth === "apiKey"
            );
            const requiresOauth = platform.packageInfo?.constructors.some(
                (c: Constructor) => c.auth === "oauth2"
            );

            // Check both API key and OAuth status if required
            if (requiresApiKey && requiresOauth) {
                return platformKeyStatus[platform.name] && oauthStatus[platform.name];
            }
            // Check only API key status if required
            if (requiresApiKey) {
                return platformKeyStatus[platform.name];
            }
            // Check only OAuth status if required
            if (requiresOauth) {
                const oauthConstructor = platform.packageInfo.constructors.find(
                    (c: Constructor) => c.auth === "oauth2"
                );
                const matchingOAuthSecret = oauthSecrets?.find(
                    (secret) =>
                        secret.type ===
                        `${platform.packageInfo.name}/${oauthConstructor?.name}`
                );

                const doKeysHaveValues = matchingOAuthSecret?.variables.every(
                    (variable: any) => variable.value?.trim() !== ""
                );

                const areKeysMatchingwithInternalKeys =
                    matchingOAuthSecret?.variables.every((variable: any) =>
                        oauthConstructor?.internalKeys.some((key: ClientSecretVariable) => {
                            if (variable.key === "SCOPES") return true;
                            return key.key === variable.key;
                        })
                    );

                return doKeysHaveValues && areKeysMatchingwithInternalKeys;
            }
            return true;
        });
    }, [platforms, platformKeyStatus, oauthStatus, oauthSecrets]);


    console.log("secretsData", secretsData);
    // If no platforms available, don't render anything
    if (!platforms || platforms.length === 0) {
        return null;
    }

    return (
        <motion.div
            key={uiAnnotation.objectType + idx}
            className="flex flex-col gap-6 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="">
                <h3 className="text-lg font-semibold text-gray-900">
                    Configure Integration Settings
                </h3>
                <p className="text-sm text-gray-500">
                    Please configure the required integrations to continue
                </p>
            </div>

            <div className="grid gap-4">
                {platforms.map((platform, index) => {
                    const packageInfo = platform.packageInfo as Package;
                    const isApiKeyRequired = packageInfo?.constructors.some(
                        (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.APIKEY
                    );
                    const isOAuthRequired = packageInfo?.constructors.some(
                        (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.OAUTH2
                    );
                    return (
                        <div
                            key={platform.name}
                            className="flex rounded-lg border p-4 flex-col gap-2"
                        >
                            <div className="flex items-start gap-3">
                                <img src={packageInfo?.icon} alt={packageInfo?.name} className="w-5 h-5 mt-2" />
                                <div className="flex-1">
                                    <div className="flex gap-2 items-center justify-between">
                                        <div className="flex flex-col items-start gap-2">
                                            <span className="leading-none font-medium w-fit text-gray-900">
                                                {platform.name}
                                            </span>
                                            <span className="text-xs line-clamp-1 max-w-[200px] flex-1 w-full bg-gray-100 text-gray-600 px-1 rounded-full">
                                                {packageInfo?.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-lg border border-gray-200">
                                            {isOAuthRequired && (
                                                <OAuthButton
                                                    packageInfo={packageInfo}
                                                    secretsData={secretsData}
                                                    mutateSecrets={mutateSecrets}
                                                />
                                            )}
                                            {isApiKeyRequired && (
                                                <ApiKeyButton
                                                    packageInfo={packageInfo}
                                                    secretsData={secretsData}
                                                    mutateSecrets={mutateSecrets}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-3">
                                        {platform.reason}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ActionButtons
                buttons={uiAnnotation.buttons}
                areKeysRequired={platforms.some(
                    (p) =>
                        !p.optional &&
                        (p.packageInfo?.constructors.some(
                            (c: Constructor) => c.auth === "apiKey"
                        ) ||
                            p.packageInfo?.constructors.some(
                                (c: Constructor) => c.auth === "oauth2"
                            ))
                )}
                areKeysFilled={areKeysFilled}
            />
        </motion.div>
    );
}; 