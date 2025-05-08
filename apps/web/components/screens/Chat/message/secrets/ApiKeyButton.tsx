import { Key, CheckCircle2, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskIntegrationPlatform } from "@/server/convertfox/types";
import { useMemo, useState } from "react";
import { APIKeyDialog } from "./APIKeyDialog";
import { ClientSecret, ClientSecretTemplate } from "@prisma/client";
import { ClientSecretPackageType, ClientSecretApiType, ClientSecretVariable } from "@/server/types";
import { Constructor, KeyVariableConfig } from "../types";
import useSWR, { KeyedMutator } from "swr";
import { useParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { SecretProvider } from "@/components/screens/mybots/providers/SecretProvider";
import { SecretFormProvider } from "@/components/screens/mybots/providers/SecretFormProvider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TemplateDialog } from "./TemplateDialog";

export const ApiKeyButton = ({
    packageInfo,
    mutateSecrets,
    secretsData
}: {
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
    console.log("botSecretsData", botSecretsData);
    const botSecrets = botSecretsData?.clientSecrets;
    const botTemplates = botSecretsData?.clientSecretTemplates;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<any | null>(
        null
    );
    const [selectedBotSecret, setSelectedBotSecret] = useState<string | null>(null);
    const [selectedTemplateSecret, setSelectedTemplateSecret] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    const constructor = packageInfo?.constructors.find((c: Constructor) => c.auth === ClientSecretPackageType.APIKEY);
    const packageApiType = constructor?.apiType as ClientSecretApiType;
    const [isLoading, setIsLoading] = useState(false);

    // Find the current API key secret from secretsData
    const currentApiKeySecret = useMemo(() => {
        return secretsData?.clientSecrets?.find((secret) =>
            secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === constructor?.name
        );
    }, [secretsData, packageInfo, constructor]);

    // Set the selected bot secret to the current API key secret when it changes
    useMemo(() => {
        if (currentApiKeySecret) {
            setSelectedBotSecret(currentApiKeySecret.id);
        }
    }, [currentApiKeySecret]);

    const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
        secret !== undefined && secret.packageName === packageInfo?.name && secret.packageConstructor === constructor?.name
    );
    const isAllRequiredKeysFilled = useMemo(() => {
        if (apiKeySecret && constructor && constructor.requiredKeys) {
            //console.log("apiKeySecret", apiKeySecret, constructor.requiredKeys);
            return apiKeySecret ? constructor.requiredKeys.every(
                (keyInfo: KeyVariableConfig) =>
                    (apiKeySecret.variables as any[]).some(
                        (variable: ClientSecretVariable) =>
                            variable.key === keyInfo.key && variable.value?.trim()
                    )
            ) : false;
        }
        return false;
    }, [packageInfo, apiKeySecret, constructor]);

    //console.log("apiKeySecret", packageInfo, secretsData);

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
        if (value === "add_new") {
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

    // If there are no bot secrets, show the direct "Add Bot" button
    // if (!botSecrets || botSecrets.length === 0) {
    //     return (
    //         <>
    //             <div className="relative">
    //                 <Button
    //                     variant="ghost"
    //                     size="sm"
    //                     className="p-0 hover:bg-gray-100 relative"
    //                     onClick={() => {
    //                         setSelectedPlatform(platform);
    //                         setIsDialogOpen(true);
    //                     }}
    //                 >
    //                     <Key className="h-4 w-4" />
    //                     {packageApiType === ClientSecretApiType.BOT_TOKEN ? "Add Bot" : "Add API Key"}
    //                 </Button>
    //                 {!isAllRequiredKeysFilled ? (
    //                     <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400" />
    //                 ) : (
    //                     <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-4 w-4 rounded-full text-green-500" />
    //                 )}
    //             </div>

    //             {selectedPlatform && (
    //                 <APIKeyDialog
    //                     mutateSecrets={mutateSecrets}
    //                     isOpen={isDialogOpen}
    //                     onClose={async (submitted) => {
    //                         setIsDialogOpen(false);
    //                         setSelectedPlatform(null);
    //                         if (submitted) {
    //                             await mutateSecrets();
    //                         }
    //                     }}
    //                     platformName={selectedPlatform.name}
    //                     pkg={selectedPlatform.packageInfo}
    //                     apiKeySecret={secretsData?.clientSecrets?.find((secret) =>
    //                         secret !== undefined && secret !== null && secret.packageName === selectedPlatform.packageInfo?.name && secret.packageConstructor === constructor?.name
    //                     )}
    //                 />
    //             )}
    //         </>
    //     );
    // }

    return (
        <>
            <div className="relative flex items-center gap-1">

                <Select value={selectedBotSecret || ""} onValueChange={handleBotSelectionChange}>
                    <SelectTrigger className="h-8 max-w-[150px] border-none shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs text-gray-500">Processing...</span>
                            </div>
                        ) : (
                            <SelectValue placeholder={packageApiType === ClientSecretApiType.BOT_TOKEN ? "Bot" : "API Key"} />
                        )}
                    </SelectTrigger>
                    <SelectContent className="">
                        {botSecrets?.map((secret) => (
                            <SelectItem key={secret.id} value={secret.id}
                                className="flex items-center justify-between gap-2 py-3 cursor-pointer"
                            >
                                <div className="flex flex-col items-start gap-2">
                                    <span className="leading-none w-full">{secret.name || "Unnamed Bot"}</span>
                                    {/* <span className="text-xs text-gray-500">
                                        key: {secret.id ? `${secret.id.substring(0, 4)}...${secret.id.substring(secret.id.length - 4)}` : ''}
                                    </span> */}
                                </div>
                            </SelectItem>
                        ))}
                        {botTemplates?.filter((template) => !botSecrets?.some((secret) => secret.templateId === template.id))
                            .map((template) => (
                                <SelectItem key={template.id} value={"template_" + template.id} className="flex items-center gap-2 cursor-pointer">
                                    <img src={"/images/default-bot-avatar.png"} className="h-4 w-4 rounded-full" />
                                    <span className="leading-none w-full">use {template.name || "Unnamed Bot"}</span>
                                </SelectItem>
                            ))}
                        <SelectItem value="add_new" className="flex items-center gap-2 cursor-pointer">
                            <Plus className="h-4 w-4" />
                            {packageApiType === ClientSecretApiType.BOT_TOKEN ? "Add New Bot" : "Add New API Key"}
                        </SelectItem>
                    </SelectContent>
                </Select>

                {!isAllRequiredKeysFilled ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400" />
                ) : (
                    <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-4 w-4 rounded-full text-green-500" />
                )}
            </div>

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
                    botTemplates={botTemplates}
                    packageInfo={packageInfo}
                    mutateSecrets={mutateSecrets}
                    mutateBotSecrets={mutateBotSecrets}
                />
            )}
        </>
    )
}