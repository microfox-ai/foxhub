import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { TaskIntegrationPlatform } from "@/server/convertfox/types";
import { useMemo, useState } from "react";
import { APIKeyDialog } from "./APIKeyDialog";
import { ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "@/server/types";
import { Constructor } from "../types";
import { KeyedMutator } from "swr";

export const ApiKeyButton = ({
    platform,
    mutateSecrets,
    secretsData,
}: {
    platform: TaskIntegrationPlatform,
    secretsData?: {
        clientSecrets: ClientSecret[],
    },
    mutateSecrets: KeyedMutator<{
        clientSecrets: ClientSecret[];
    }>

}) => {

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<TaskIntegrationPlatform | null>(
        null
    );
    const constructor = platform.packageInfo?.constructors.find((c: Constructor) => c.auth === "apiKey");
    const isAllRequiredKeysFilled = useMemo(() => {
        const apiKeySecret = secretsData?.clientSecrets?.find((secret) =>
            secret !== undefined && secret.packageName === platform.packageInfo?.name && secret.packageConstructor === constructor?.name
        );
        if (apiKeySecret && constructor && constructor.requiredKeys) {
            return apiKeySecret ? constructor.requiredKeys.every(
                (keyInfo: ClientSecretVariable) =>
                    (apiKeySecret.variables as any[]).some(
                        (variable: ClientSecretVariable) =>
                            variable.key === keyInfo.key && variable.value?.trim()
                    )
            ) : false;
        }
        return false;
    }, [platform])

    return (
        <>
            <div className="relative">
                <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 hover:bg-gray-100 relative"
                    onClick={() => {
                        setSelectedPlatform(platform);
                        setIsDialogOpen(true);
                    }}
                >
                    <Key className="h-4 w-4" />
                    Add API Keys
                </Button>
                {!isAllRequiredKeysFilled ? (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400" />
                ) : (
                    <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-4 w-4 rounded-full text-green-500" />
                )}
            </div>

            {selectedPlatform && (
                <APIKeyDialog
                    mutateSecrets={mutateSecrets}
                    isOpen={isDialogOpen}
                    onClose={async (submitted) => {
                        setIsDialogOpen(false);
                        setSelectedPlatform(null);
                        if (submitted) {
                            await mutateSecrets();
                        }
                    }}
                    platformName={selectedPlatform.name}
                    pkg={selectedPlatform.packageInfo}
                    apiKeySecret={secretsData?.clientSecrets?.find((secret) =>
                        secret !== undefined && secret !== null && secret.packageName === selectedPlatform.packageInfo?.name && secret.packageConstructor === constructor?.name
                    )}
                />
            )}
        </>
    )
}