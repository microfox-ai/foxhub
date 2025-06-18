import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { ActionButtons } from "./ActionButtons";
import { ApiKeyButton } from "../secrets/ApiKeyButton";
import { OAuthButton } from "../secrets/OAuthButton";
import { ClientSecret } from "@prisma/client";
import { Constructor, KeyVariableConfig, Package } from "../types";
import { TaskIntegrationPlatform } from "@/server/convertfox/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClientSecretApiType, ClientSecretPackageType, ClientSecretVariable, PackageStatus } from "@/server/types";
import { useTaskInstanceMetaContext } from "@/components/screens/providers/TaskInstanceMetaProvider";
import { EditTaskIntegrationsDialog } from "./EditTaskIntegrationsDialog";
import { Button } from "@/components/ui/button";
import { useMicrofoxChat } from "../../MicrofoxChatProvider";

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
    hideMetaInfo?: boolean;
    isLastInQueue?: boolean;
}

export const TaskIntegrations = ({
    uiAnnotation,
    idx,
    hideMetaInfo = false,
    isLastInQueue = true,
}: TaskIntegrationsProps) => {
    const { taskInstanceMeta, updateTaskInstanceMeta, mutate: mutateTaskInstanceMeta } = useTaskInstanceMetaContext();
    const [isExpanded, setIsExpanded] = useState(false);
    const { status } = useMicrofoxChat();
    const platforms = useMemo(() => {
        if (isLastInQueue && status !== "streaming") {
            return (taskInstanceMeta?.taskIntegrations?.platforms ?? uiAnnotation.object.platforms) as TaskIntegrationPlatform[];
        }
        return uiAnnotation.object.platforms as TaskIntegrationPlatform[];
    }, [isLastInQueue, taskInstanceMeta, uiAnnotation.object.platforms, status]);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;

    useEffect(() => {
        if (isLastInQueue && requestParamId) {
            mutateTaskInstanceMeta();
        }
    }, [isLastInQueue, requestParamId, mutateTaskInstanceMeta]);

    const { data: packagesData, mutate: mutatePackages } = useSWR<Package[]>(
        `/api/packages/infos?packageNames=${platforms.map((p) => p.package).join(",")}&rawContent=true`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        },
        {
            revalidateOnFocus: false,
        }
    );

    const { data: secretsData, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        requestParamId
            ? `/api/client-secrets?clientRequestId=${requestParamId}&status=FILLED`
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
            let packageInfo = packagesData?.find((pkg) => pkg.name === platform.package);
            // Set default status for non-optional platforms
            if (!platform.optional) {
                keyStatus[platform.name] = false;
                authStatus[platform.name] = false;
            }
            // Check API Keys
            if (packageInfo?.constructors.some((c: Constructor) => c.auth === ClientSecretPackageType.APIKEY)) {
                const constructor = packageInfo?.constructors.find((c: Constructor) => c.auth === ClientSecretPackageType.APIKEY);
                const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
                    secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === constructor?.name
                );
                if (apiKeySecret && constructor && constructor.requiredKeys) {
                    keyStatus[platform.name] = apiKeySecret ? constructor.requiredKeys.every(
                        (keyInfo: KeyVariableConfig) =>
                            (apiKeySecret.variables as any[]).some(
                                (variable: ClientSecretVariable) =>
                                    variable.key === keyInfo.key && variable.value?.trim()
                            )
                    ) : false;
                }
            }
            // Check OAuth
            if (packageInfo?.constructors.some((c: Constructor) => c.auth === ClientSecretPackageType.OAUTH2)) {
                const oauthConstructor = packageInfo.constructors.find((c: Constructor) => c.auth === ClientSecretPackageType.OAUTH2);
                const oauthSecret = secretsData?.clientSecrets?.find((secret) =>
                    secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
                );
                if (oauthConstructor && oauthSecret && oauthConstructor.internalKeys) {
                    authStatus[platform.name] = oauthSecret
                        ? (oauthSecret.variables as any[]).every(
                            (variable: KeyVariableConfig) =>
                                variable.value?.trim() !== "" &&
                                oauthConstructor.internalKeys.some(
                                    (key: KeyVariableConfig) => key.key === variable.key
                                )
                        )
                        : false;
                }
            }
        });

        return { platformKeyStatus: keyStatus, oauthStatus: authStatus };
    }, [platforms, secretsData?.clientSecrets, oauthSecrets, packagesData]);

    // Memoize the areKeysFilled check
    const areKeysFilled = useMemo(() => {
        return platforms.every((platform) => {
            // If platform is optional, skip the check
            if (platform.optional) return true;

            let packageInfo = packagesData?.find((pkg) => pkg.name === platform.package);

            const requiresApiKey = packageInfo?.constructors.some(
                (c: Constructor) => c.auth === ClientSecretPackageType.APIKEY
            );
            const requiresOauth = packageInfo?.constructors.some(
                (c: Constructor) => c.auth === ClientSecretPackageType.OAUTH2
            );
            // Check both API key and OAuth status if required
            if (requiresApiKey && requiresOauth) {
                return platformKeyStatus[platform.name] || oauthStatus[platform.name];
            }
            // Check only API key status if required
            if (requiresApiKey) {
                return platformKeyStatus[platform.name];
            }
            // Check only OAuth status if required
            if (requiresOauth) {
                const oauthConstructor = packageInfo?.constructors.find(
                    (c: Constructor) => c.auth === "oauth2"
                );
                const matchingOAuthSecret = oauthSecrets?.find(
                    (secret) =>
                        secret.type ===
                        `${packageInfo?.name}/${oauthConstructor?.name}`
                );

                const doKeysHaveValues = matchingOAuthSecret?.variables.every(
                    (variable: any) => variable.value?.trim() !== ""
                );

                const areKeysMatchingwithInternalKeys =
                    matchingOAuthSecret?.variables.every((variable: any) =>
                        oauthConstructor?.internalKeys.some((key: KeyVariableConfig) => {
                            if (variable.key === "SCOPES") return true;
                            return key.key === variable.key;
                        })
                    );

                return doKeysHaveValues && areKeysMatchingwithInternalKeys;
            }
            return true;
        });
    }, [platforms, platformKeyStatus, oauthStatus, oauthSecrets, packagesData]);

    const handleSaveTaskIntegrations = async (updatedPlatforms: TaskIntegrationPlatform[]) => {
        if (taskInstanceMeta) {
            await updateTaskInstanceMeta({
                ...taskInstanceMeta,
                taskIntegrations: {
                    platforms: updatedPlatforms,
                },
            });
        }
    };

    //console.log("secretsData", secretsData);
    // If no platforms available, don't render anything
    if (!platforms || platforms.length === 0) {
        return null;
    }

    if (!isLastInQueue && !isExpanded) {
        return (
            <motion.div
                key={uiAnnotation.objectType + idx}
                className={`flex flex-col gap-2 p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
            >
                <p className="text-sm text-gray-500">
                    This integration is deprecated & modified. Please refer to the latest message to check or modify.
                </p>
                <Button
                    variant="link"
                    onClick={() => setIsExpanded(true)}
                    className="text-sm p-0 h-auto self-start"
                >
                    Show Previous
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            key={uiAnnotation.objectType + idx}
            className={`flex flex-col gap-6  ${hideMetaInfo ? "" : "p-4 bg-white my-4 rounded-xl border border-gray-100 shadow-lg"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            {!hideMetaInfo && (
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Make the connections
                        </h3>
                        <p className="text-sm text-gray-500">
                            Please configure the required integrations to continue
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isLastInQueue && (
                            <Button variant="link" onClick={() => setIsExpanded(false)}>
                                Hide
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {platforms
                    .map((platform, index) => {
                        const packageInfo = packagesData?.find((pkg) => pkg.name === platform.package);
                        const isApiKeyRequired = packageInfo?.constructors.some(
                            (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.APIKEY
                        );
                        const isOAuthRequired = packageInfo?.constructors.some(
                            (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.OAUTH2
                        );
                        return (
                            <div
                                key={platform.name}
                                className={`flex border-b border-gray-200 p-4 flex-col gap-2 ${index === platforms.length - 1 ? "border-b-0" : ""}`}
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
                                                    {packageInfo?.name ?? "Not Supported yet"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 relative">
                                                {isOAuthRequired && !isApiKeyRequired && (
                                                    <OAuthButton
                                                        packageInfo={packageInfo}
                                                        secretsData={secretsData}
                                                        mutateSecrets={mutateSecrets}
                                                        disabled={!isLastInQueue}
                                                    />
                                                )}
                                                {isApiKeyRequired && (
                                                    <ApiKeyButton
                                                        packageInfo={packageInfo}
                                                        secretsData={secretsData}
                                                        mutateSecrets={mutateSecrets}
                                                        disabled={!isLastInQueue}
                                                    />
                                                )}
                                                {!packageInfo}
                                            </div>
                                        </div>
                                        {packageInfo?.name && <p className="text-sm text-gray-600 mt-3">
                                            {platform.reason}
                                        </p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="flex justify-start items-center gap-2">

                <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="flex items-center gap-2"
                    disabled={!isLastInQueue}
                >
                    Edit Integrations
                </Button>
                {uiAnnotation.buttons && uiAnnotation.buttons.length > 0 &&
                    (<ActionButtons
                        className="mt-0"
                        buttons={uiAnnotation.buttons}
                        areKeysRequired={platforms.some(
                            (p) => {
                                const packageInfo = packagesData?.find((pkg) => pkg.name === p.package);
                                return !p.optional &&
                                    (packageInfo?.constructors.some(
                                        (c: Constructor) => c.auth === ClientSecretPackageType.APIKEY
                                    ) ||
                                        packageInfo?.constructors.some(
                                            (c: Constructor) => c.auth === ClientSecretPackageType.OAUTH2
                                        ));
                            })}
                        areKeysFilled={areKeysFilled}
                        disabled={!isLastInQueue}
                    />)}
            </div>

            <EditTaskIntegrationsDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                platforms={platforms}
                packages={packagesData || []}
                onSave={handleSaveTaskIntegrations}
            />
        </motion.div>
    );
}; 