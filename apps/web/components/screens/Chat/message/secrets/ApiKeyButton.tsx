import { SecretFormProvider } from "@/components/screens/mybots/providers/SecretFormProvider";
import { SecretProvider } from "@/components/screens/mybots/providers/SecretProvider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ClientSecretApiType, ClientSecretPackageType, ClientSecretVariable } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { ClientSecret, CLIENTSECRETSTATUS, ClientSecretTemplate } from "@prisma/client";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR, { KeyedMutator } from "swr";
import { Constructor, KeyVariableConfig } from "../types";
import { APIKeyDialog } from "./APIKeyDialog";
import { TemplateDialog } from "./TemplateDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBotImage } from "@/components/screens/mybots/providers/types";

export const ApiKeyButton = ({
    packageInfo,
    mutateSecrets,
    secretsData,
    disabled
}: {
    packageInfo: any,
    secretsData?: {
        clientSecrets: ClientSecret[],
    },
    mutateSecrets: KeyedMutator<{
        clientSecrets: ClientSecret[];
    }>
    disabled?: boolean;
}) => {
    const params = useParams<{
        project_id?: string;
        request_id?: string;
    }>();
    const projectParamId = params?.project_id;
    const requestParamId = params?.request_id;


    const { data: botSecretsData, mutate: mutateBotSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
        clientSecretTemplates: ClientSecretTemplate[];
    }>(
        projectParamId
            ? `/api/client-secrets?botProjectId=${projectParamId}&packageType=${ClientSecretPackageType.APIKEY}&packageName=${packageInfo?.name}&includeTemplateSecrets=true`
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
    const botSecrets = botSecretsData?.clientSecrets;
    const botTemplates = botSecretsData?.clientSecretTemplates;
    const { user } = useAuth();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<any | null>(
        null
    );
    const [selectedBotSecret, setSelectedBotSecret] = useState<string | null>(null);
    const [selectedTemplateSecret, setSelectedTemplateSecret] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // Find the current API key secret from secretsData
    const apiKeyConstructor = packageInfo?.constructors.find((c: Constructor) => c.auth === ClientSecretPackageType.APIKEY);
    const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
        secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === apiKeyConstructor?.name
    );
    const apiType = apiKeyConstructor?.apiType as ClientSecretApiType;
    const currentApiKeySecret = useMemo(() => {
        return secretsData?.clientSecrets?.find((secret) =>
            secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === apiKeyConstructor?.name
        );
    }, [secretsData, packageInfo, apiKeyConstructor]);
    // Set the selected bot secret to the current API key secret when it changes
    useMemo(() => {
        if (currentApiKeySecret) {
            setSelectedBotSecret(currentApiKeySecret.id);
        }
    }, [currentApiKeySecret]);

    const oauthConstructor = packageInfo?.constructors.find(
        (c: Constructor) => c.auth === "oauth2"
    );
    const oauthSecret = secretsData?.clientSecrets?.find((secret) =>
        secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
    );
    const currentOauthSecret = useMemo(() => {
        return secretsData?.clientSecrets?.find((secret) =>
            secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === oauthConstructor?.name
        );
    }, [secretsData, packageInfo, oauthConstructor]);

    const isAllKeysFilled = useMemo(() => {
        if (apiKeySecret) {
            return apiKeyConstructor?.requiredKeys.every(
                (keyInfo: KeyVariableConfig) =>
                    (apiKeySecret.variables as any[]).some(
                        (variable: ClientSecretVariable) =>
                            variable.key === keyInfo.key && variable.value?.trim()
                    )
            )
        }
        else if (oauthSecret) {
            return (oauthSecret?.variables as any[]).every(
                (variable: ClientSecretVariable) =>
                    variable.value?.trim() !== "" &&
                    oauthConstructor?.internalKeys.some((key: KeyVariableConfig) => {
                        if (variable.key === "SCOPES") return true;
                        return key.key === variable.key;
                    })
            )
        }
        return false;
    }, [packageInfo, apiKeySecret, apiKeyConstructor, oauthSecret]);

    //--------------FOR OAUTH-------------------
    //console.log("apiKeySecret", packageInfo, secretsData);]
    const hasAllAuthRelatedKeys = oauthSecret
        ? (oauthSecret?.variables as any[]).every(
            (variable: ClientSecretVariable) =>
                variable.value?.trim() !== "" &&
                oauthConstructor?.internalKeys.some((key: KeyVariableConfig) => {
                    if (variable.key === "SCOPES") return true;
                    return key.key === variable.key;
                })
        )
        : false;
    // Set the selected bot secret to the current oauth secret when it changes
    useMemo(() => {
        if (currentOauthSecret && hasAllAuthRelatedKeys) {
            setSelectedBotSecret("connect");
        }
    }, [currentOauthSecret, hasAllAuthRelatedKeys]);

    // Handle bot selection change
    const handleBotSelectionChange = async (value: string) => {
        setIsLoading(true);
        // if added another client secret already in this client request, remove it from the client request
        if (apiKeySecret) {
            await PortalSdk.postData("/api/client-secrets/link", {
                id: apiKeySecret.id,
                clientRequestIdToRemove: requestParamId,
            });
        }
        if (value === "connect") {
            setIsLoading(false);
            setSelectedPlatform(packageInfo);
            await handleConnect(packageInfo, oauthConstructor?.authEndpoint);
            setIsLoading(false);
        }
        else if (value === "add_new") {
            if (apiKeySecret) {
                setSelectedBotSecret(null);
            }
            await mutateSecrets();
            setIsLoading(false);
            setSelectedPlatform(packageInfo);
            setIsDialogOpen(true);
        }
        else if (value.startsWith("template_")) {
            if (apiKeySecret) {
                setSelectedBotSecret(null);
            }
            await mutateSecrets();
            setIsLoading(false);
            setSelectedPlatform(packageInfo);
            setSelectedTemplateSecret(value.replace("template_", ""));
            setTemplateDialogOpen(true);
        }
        else {
            setIsLoading(true);
            setSelectedBotSecret(value);
            // add existing client secret (id: value) to this client request
            await PortalSdk.postData("/api/client-secrets/link", {
                id: value,
                clientRequestIdToAdd: requestParamId,
            });
            await mutateBotSecrets();
            await mutateSecrets();
            setIsLoading(false);
            // Here you would implement the logic to use the selected bot
            // This might involve calling an API to update the current request with the selected bot
        }
    };

    const [connecting, setConnecting] = useState<Record<string, boolean>>({});

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
                packageConstructor: oauthConstructor?.name,
                packageType: ClientSecretPackageType.OAUTH2,
                userId: user?.id,
                status: CLIENTSECRETSTATUS.EMPTY,
                botConfig: [],
                variables: [
                    ...oauthConstructor.internalKeys.map((key: KeyVariableConfig) => ({
                        key: key.key,
                        value: key.defaultValue
                            ? Array.isArray(key.defaultValue)
                                ? key.defaultValue.join(",")
                                : key.defaultValue
                            : "",
                        isOptional: false,
                    })),
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


    return (
        <div className="flex flex-col gap-2">
            <Select
                value={selectedBotSecret || ""}
                onValueChange={handleBotSelectionChange}
                disabled={disabled}
            >
                <SelectTrigger
                    className="w-full"
                    disabled={isLoading || disabled}
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> :
                        <SelectValue
                            placeholder={
                                <div className="flex items-center gap-2">
                                    {apiType === ClientSecretApiType.BOT_TOKEN ? "Bot" : "API Key"}
                                </div>
                            }
                        />
                    }
                </SelectTrigger>
                <SelectContent className="">
                    {botSecrets?.map((secret) => (
                        <SelectItem key={secret.id} value={secret.id}
                            className="flex items-center justify-between gap-2 py-3 cursor-pointer"
                        >
                            <div className="flex flex-row items-center gap-2">
                                <img src={getBotImage(secret)} className="h-6 w-6 rounded-full" />
                                <span className="leading-none w-full">{secret.name || "Unnamed Bot"}</span>
                                {/* <span className="text-xs text-gray-500">
                                    key: {secret.id ? `${secret.id.substring(0, 4)}...${secret.id.substring(secret.id.length - 4)}` : ''}
                                </span> */}
                            </div>
                        </SelectItem>
                    ))}
                    {oauthConstructor && (
                        <SelectItem value="connect" className="flex items-center gap-2 cursor-pointer">
                            <img src={"/images/default-bot-avatar.png"} className="h-6 w-6 rounded-full" />
                            {hasAllAuthRelatedKeys ? "Connected Microfox" : "Connect Microfox"}
                        </SelectItem>
                    )}
                    {botTemplates?.filter((template) => !botSecrets?.some((secret) => secret.templateId === template.id))
                        .map((template) => (
                            <SelectItem key={template.id} value={"template_" + template.id} className="flex items-center gap-2 cursor-pointer">
                                <img src={"/images/default-bot-avatar.png"} className="h-4 w-4 rounded-full" />
                                <span className="leading-none w-full">use {template.name || "Unnamed Bot"}</span>
                            </SelectItem>
                        ))}
                    <SelectItem value="add_new" className="flex items-center gap-2 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        {apiType === ClientSecretApiType.BOT_TOKEN ? "Create New Bot" : "Create New API Key"}
                    </SelectItem>
                </SelectContent>
            </Select>

            {!isAllKeysFilled ? (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400" />
            ) : (
                <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-4 w-4 rounded-full text-green-500" />
            )}

            {selectedPlatform && (
                <SecretProvider>
                    <SecretFormProvider>
                        <APIKeyDialog
                            mutateSecrets={mutateSecrets}
                            isOpen={isDialogOpen}
                            onClose={async (submitted) => {
                                setIsDialogOpen(false);
                                if (submitted) {
                                }
                                setSelectedPlatform(null);
                                if (submitted) {
                                    // if added another client secret already in this client request, remove it from the client request
                                    await mutateSecrets();
                                    await mutateBotSecrets();
                                }
                            }}
                            platformName={selectedPlatform.name}
                            pkg={selectedPlatform}
                            apiKeySecret={apiKeySecret}
                        />
                    </SecretFormProvider>
                </SecretProvider>
            )}
            {selectedTemplateSecret && (
                <TemplateDialog
                    isOpen={templateDialogOpen}
                    onClose={() => {
                        setTemplateDialogOpen(false);
                        setSelectedTemplateSecret(null);
                    }}
                    onCancel={() => {
                        setTemplateDialogOpen(false);
                        setSelectedTemplateSecret(null);
                    }}
                    selectedTemplate={botTemplates?.find((template) => template.id === selectedTemplateSecret) || null}
                    secretsData={botSecretsData}
                    packageInfo={packageInfo}
                    mutateSecrets={mutateSecrets}
                    mutateBotSecrets={mutateBotSecrets}
                />
            )}
        </div>
    )
}