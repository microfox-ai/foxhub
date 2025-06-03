import { Button } from "@/components/ui/button";
import { ClientSecretPackageType, ClientSecretVariable, ClientSecretWithPackageInfo } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { ClientSecret } from "@prisma/client";
import { Edit, Key, RouteIcon, ShieldAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { EnvVariablesDialog } from "../configuration/EnvVariablesDialog";
import { ApiKeyButton } from "../message/secrets/ApiKeyButton";
import { OAuthButton } from "../message/secrets/OAuthButton";
import { Constructor } from "../message/types";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialogue";

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
            ? `/api/client-secrets?clientRequestId=${clientRequestId}&withPackageInfos=true&status=FILLED`
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

    const envsToCollect = (taskInstanceMeta?.buildingStep as any)?.envsToCollect;
    const platforms = taskInstanceMeta?.taskIntegrations?.platforms as any[];

    return (
        <div>
            <div className="w-full flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Platforms & Connections
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
                                            {isOAuthRequired && !isApiKeyRequired && (
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
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

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