import { Edit, Package, RouteIcon, ShieldAlertIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Key } from "lucide-react";
import useSWR from "swr";
import { ClientSecret } from "@prisma/client";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SecretCard } from "./SecretCard";
import { EnvVariablesDialog } from "../message/EnvVariablesDialog";
import { APIKeyDialog } from "../message/secrets/APIKeyDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialogue";
import { ClientSecretPackageType, ClientSecretVariable, ClientSecretWithPackageInfo } from "@/server/types";
import { useTaskInstanceMeta, useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { OAuthButton } from "../message/secrets/OAuthButton";
import { ApiKeyButton } from "../message/secrets/ApiKeyButton";
import { Constructor } from "../message/types";



export const SecretVault = () => {


    const { clientRequestId, projectId } = useClientProject();
    const { taskInstanceMeta } = useTaskInstanceMetaContext();
    const [showAddEnvModal, setShowAddEnvModal] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<ClientSecret | null>(
        null
    );
    const [secretToDelete, setSecretToDelete] = useState<ClientSecret | null>(
        null
    );
    const [isDialogOpen, setIsDialogOpen] = useState(false);


    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const toggleSecretVisibility = (secretId: string) => {
        setShowSecrets((prev) => ({
            ...prev,
            [secretId]: !prev[secretId],
        }));
    };

    const { data: allSecrets, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecretWithPackageInfo[];
    }>(
        clientRequestId
            ? `/api/client-secrets?clientRequestId=${clientRequestId}&withPackageInfos=true`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch secrets");
            return res.json();
        }
    );
    const allVariablesCount = allSecrets?.clientSecrets?.reduce((acc, secret) => acc + (secret.variables?.length || 0), 0) || 0;

    const customSecrets = allSecrets?.clientSecrets?.filter((secret) => secret?.packageType === ClientSecretPackageType.CUSTOM) || [];
    const customSecret = customSecrets && customSecrets?.length > 0 ? customSecrets?.[0] : null;

    const templateSecrets = allSecrets?.clientSecrets?.filter((secret) => secret?.packageType === ClientSecretPackageType.TEMPLATE) || [];
    const templateVariables = templateSecrets?.map((secret) => secret.variables).flat() || [];

    const platformSecrets =
        allSecrets?.clientSecrets?.filter((secret) => secret?.packageType === ClientSecretPackageType.APIKEY || secret?.packageType === ClientSecretPackageType.OAUTH2) ||
        [];


    const handleDeleteSecret = async (secret: ClientSecret) => {
        try {
            const response = await fetch(
                `/api/client-secrets?id=${secret.id}&clientRequestId=${clientRequestId}&removeOnly=true`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete secret");
            }

            await mutateSecrets();
            toast.success("Secret deleted successfully");
            setSecretToDelete(null);
        } catch (error) {
            toast.error("Failed to delete secret");
        }
    };


    const handleSaveCustomEnv = async (values: Record<string, string>) => {
        if (!customSecret) {
            toast.error("Custom secret not found");
            return;
        }

        const body = {
            id: customSecret.id,
            variables: Object.entries(values)
                .filter(([_, value]) => value.trim())
                .map(([key, value]) => ({
                    key,
                    value: value.trim(),
                    isOptional: false,
                })),
        };

        await toast.promise(
            PortalSdk.putData("/api/client-secrets/update-deployments", body)
                .then(async () => {
                    await mutateSecrets();
                    return "Configuration updated successfully";
                }),
            {
                loading: "Updating configuration...",
                success: () => "Configuration updated successfully",
                error: "Failed to save Configuration. Please try again.",
            }
        );
    };

    const envsToCollect = (taskInstanceMeta?.buildingStep as any)?.envsToCollect;
    const platforms = taskInstanceMeta?.taskIntegrations?.platforms as any[];


    return (
        <div>
            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-8">
                    <Key className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Settings
                    </h3>
                    <div className="h-6 w-px bg-gray-200" />
                    <span className="text-sm text-gray-500">
                        {allVariablesCount} key{allVariablesCount !== 1 ? "s" : ""}{" "}

                    </span>
                </div>

                {platforms?.map((platform) => {
                    const packageInfo = platform.packageInfo as any;
                    const isApiKeyRequired = packageInfo?.constructors.some(
                        (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.APIKEY
                    );
                    const isOAuthRequired = packageInfo?.constructors.some(
                        (constructor: Constructor) => constructor.auth.toLowerCase() === ClientSecretPackageType.OAUTH2
                    );
                    const secret = allSecrets?.clientSecrets?.find((secret) => secret?.packageName === platform?.packageInfo?.name && secret?.packageConstructor === platform?.packageInfo?.constructor);
                    return (
                        <div
                            key={platform?.name + "-" + platform?.package}
                            className="flex rounded-lg border p-4 flex-col gap-2"
                        >
                            <div className="flex items-start gap-3">
                                <img src={platform?.packageInfo?.icon} alt={platform?.packageInfo?.name} className="w-5 h-5 mt-2" />
                                <div className="flex-1">
                                    <div className="flex gap-2 items-center justify-between">
                                        <div className="flex flex-col items-start gap-2">
                                            <span className="leading-none font-medium w-fit text-gray-900">
                                                {secret?.name ?? platform.packageInfo?.title ?? platform.packageInfo?.name}
                                            </span>
                                            <span className="text-xs line-clamp-1 max-w-[200px] flex-1 w-full bg-gray-100 text-gray-600 px-1 rounded-full">
                                                {platform.packageInfo?.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-lg border border-gray-200">
                                            {isOAuthRequired && (
                                                <OAuthButton
                                                    packageInfo={platform?.packageInfo}
                                                    secretsData={allSecrets}
                                                    mutateSecrets={mutateSecrets}
                                                />
                                            )}
                                            {isApiKeyRequired && (
                                                <ApiKeyButton
                                                    packageInfo={platform?.packageInfo}
                                                    secretsData={allSecrets}
                                                    mutateSecrets={mutateSecrets}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-3">
                                        {platform?.packageInfo?.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}


                {/* <div className=" shadow-none border-none">
                    {platformSecrets.length > 0 ? (
                        <div className="bg-white rounded-xl  overflow-hidden">
                            {platformSecrets.map((secret, index) => (
                                <div
                                    key={secret.id}
                                    className={cn(
                                        "",
                                        index === platformSecrets.length - 1 && "border-b-0"
                                    )}
                                >
                                    <SecretCard
                                        secret={secret}
                                        showSecret={!!showSecrets[secret.id]}
                                        onToggleVisibility={() =>
                                            toggleSecretVisibility(secret.id)
                                        }
                                        onEdit={() => {
                                            setSelectedPlatform(secret);
                                            setIsDialogOpen(true);
                                        }}
                                        onDelete={() => setSecretToDelete(secret)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-gray-100 rounded-full">
                                    <Package className="w-6 h-6 text-gray-500" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-800">
                                    No Platform Keys
                                </h4>
                                <p className="text-gray-500 max-w-md">
                                    You haven&apos;t added any platform keys yet.
                                </p>
                            </div>
                        </div>
                    )}
                </div> */}

                {customSecret && (
                    <div className="rounded-sm border border-gray-200">
                        <div className="flex items-center justify-between px-4 pt-4">
                            <div className="flex items-center gap-2">
                                <RouteIcon className="w-4 h-4 text-yellow-500" />
                                <h1 className="text-xs uppercase tracking-widest text-gray-700">Configuration</h1>
                                {/* <p className="text-xs text-gray-300">
                                Add/Edit variables for this request
                            </p> */}
                            </div>
                            <Button
                                variant="ghost"
                                className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                onClick={() => setShowAddEnvModal(true)}
                                size="sm"
                            >
                                <Edit className="w-2 h-2" />
                            </Button>
                        </div>

                        <ul className="grid gap-4 p-4">
                            {(customSecret?.variables as any[]).map((secret: ClientSecretVariable) => (
                                <li className="flex justify-between items-center px-3 rounded-lg">
                                    <span className="font-mono text-xs text-gray-900">{secret.key}</span>
                                    {secret.value && (
                                        <span className="font-mono text-xs text-gray-900 max-w-[8ch] line-clamp-1">{"•".repeat(6)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>

                    </div>
                )}

                {templateVariables.length > 0 && (
                    <div className="rounded-sm border border-gray-200">
                        <div className="flex items-center justify-between px-4 pt-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlertIcon className="w-4 h-4 text-green-500" />
                                <h1 className="text-xs uppercase tracking-widest text-gray-700">Internal Keys</h1>
                                {/* <p className="text-xs text-gray-300">
                                Add/Edit variables for this request
                            </p> */}
                            </div>
                        </div>

                        <ul className="grid gap-4 p-4">
                            {(templateVariables as any[]).map((secret: ClientSecretVariable) => (
                                <li className="flex justify-between items-start px-3 overflow-hidden rounded-lg">
                                    <span className="font-mono text-xs text-gray-900">{secret.key}</span>
                                    {secret.value && (
                                        <span className="font-mono text-xs text-gray-900">{"•".repeat(6)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <EnvVariablesDialog
                isOpen={!!showAddEnvModal}
                onClose={() => setShowAddEnvModal(false)}
                // attach how,what & why from taskInstanceMeta
                envVariables={(customSecret?.variables as any[])?.map((secret) => {
                    const _env = envsToCollect?.find((env: any) => env.env === secret.key);
                    return _env ? _env :
                        {
                            env: secret.key,
                            name: secret.key,
                        }
                }) ?? []}
                onSave={handleSaveCustomEnv}
                // needed to map it to Record<string, string>
                initialValues={(customSecret?.variables as any[])?.reduce((acc: Record<string, string>, secret: ClientSecretVariable) => {
                    acc[secret.key] = secret.value || "";
                    return acc;
                }, {} as Record<string, string>)}
            />
            {/* {selectedPlatform && (
                <APIKeyDialog
                    mutateSecrets={mutateSecrets}
                    isOpen={!!isDialogOpen}
                    onClose={async (submitted?: boolean) => {
                        setIsDialogOpen(false);
                        setSelectedPlatform(null);
                        if (submitted) {
                            await mutateSecrets();
                        }
                    }}
                    platformName={selectedPlatform.name}
                    pkg={packageInfo}
                    existingSecret={selectedPlatform}
                    projectId={projectId || undefined}
                    requestId={clientRequestId || undefined}
                />
            )} */}
            {secretToDelete && (
                <DeleteConfirmationDialog
                    secretToDelete={secretToDelete}
                    onClose={() => setSecretToDelete(null)}
                    onDelete={() => handleDeleteSecret(secretToDelete)}
                />
            )}
        </div>
    )
}