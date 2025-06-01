import { Button } from "@/components/ui/button";
import { ClientSecretVariable } from "@/server/types";
import { BoxIcon, Check, Edit, Key, PinIcon, Plus, RouteIcon, Settings2Icon } from "lucide-react";
import { useState } from "react";
import { EnvVariablesDialog } from "../configuration/EnvVariablesDialog";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useSWR from "swr";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { ClientSecret } from "@prisma/client";

export const TaskRequiredInfo = () => {
    const { clientRequestId } = useClientProject();
    const { taskInstanceMeta } = useTaskInstanceMetaContext();
    const [showAddEnvModal, setShowAddEnvModal] = useState(false);
    const [selectedEnvKey, setSelectedEnvKey] = useState<string | null>(null);

    const { data: allSecrets, mutate: mutateSecrets } = useSWR<{
        clientSecrets: any[];
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

    const envVariablesConfig = taskInstanceMeta?.taskRequiredInfo?.customEnvVariables as any;
    const customSecrets = allSecrets?.clientSecrets?.filter((secret: ClientSecret) => secret?.packageType?.toLowerCase() === "custom") || [];
    const customSecret = customSecrets && customSecrets?.length > 0 ? customSecrets?.[0] : null;

    const envsToCollect = (taskInstanceMeta?.buildingStep as any)?.envsToCollect;

    const handleSaveCustomEnv = async (values: Record<string, string>) => {
        if (!customSecret) {
            toast.error("Custom secret not found");
            return;
        }

        try {
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

            await PortalSdk.putData("/api/client-secrets/update-deployments", body);

            await mutateSecrets();
            setShowAddEnvModal(false);
            toast.success("Configuration updated successfully");
        } catch (error) {
            console.error("Error saving environment variables:", error);
            throw error;
        }
    };

    const handleOpenEnvDialog = (envKey: string) => {
        setSelectedEnvKey(envKey);
        setShowAddEnvModal(true);
    };

    console.log(envVariablesConfig);

    return (
        <div className="w-full flex flex-col gap-4 py-4 ">
            <div className="flex items-center gap-2">
                <Settings2Icon className="w-4 h-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Configuration & Settings
                </h3>
                <div className="h-6 w-px bg-gray-200" />
                <span className="text-sm text-gray-500">
                    {envVariablesConfig?.length ?? "0"} variable{envVariablesConfig?.length !== 1 ? "s" : ""}{" "}
                </span>
                <Button
                    variant="ghost"
                    className="ml-auto border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    onClick={() => setShowAddEnvModal(true)}
                >
                    Edit Configuration
                    <Edit className="w-2 h-2" />
                </Button>
            </div>
            <div className="rounded-sm border border-gray-200 flex flex-col gap-2">
                {customSecret && (
                    <ul className="flex flex-wrap gap-4 p-4 min-h-[300px]">
                        {envVariablesConfig?.map((env: any) => {
                            const hasValue = (customSecret?.variables as any[])?.some(
                                (secret: ClientSecretVariable) => secret.key === env.env && secret.value
                            );
                            return (
                                <li key={env.env}
                                    onClick={() => handleOpenEnvDialog(env.env)}
                                    className="cursor-pointer h-fit flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50">
                                    <div

                                        className=" flex items-center gap-2">
                                        <span className="font-mono text-xs text-gray-900">{env.name || env.env}</span>

                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleOpenEnvDialog(env.env)}
                                    >
                                        {hasValue ? <Check className="w-4 h-4 text-green-500" /> : <Plus className="w-4 h-4" />}
                                    </Button>
                                </li>
                            );
                        })}
                        <li
                            onClick={() => setShowAddEnvModal(true)}
                            className="cursor-pointer h-fit flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50">
                            <div
                                className=" flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-900">New Configuration</span>

                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowAddEnvModal(true)}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </li>
                    </ul>
                )}
                {(!customSecret || !envVariablesConfig || envVariablesConfig?.length === 0) && (
                    <div className="flex flex-col items-center justify-center p-4 h-[300px]">
                        <BoxIcon className="w-10 h-10 text-gray-500 my-4" />
                        <p className="text-md text-gray-500">
                            No custom variables found
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-full"
                            onClick={() => setShowAddEnvModal(true)}
                        >
                            Add Variables
                        </Button>
                    </div>
                )}

            </div>

            <EnvVariablesDialog
                isOpen={!!showAddEnvModal}
                onClose={() => {
                    setShowAddEnvModal(false);
                    setSelectedEnvKey(null);
                }}
                envVariables={
                    envVariablesConfig ?? []
                    // selectedEnvKey
                    // ? [envsToCollect?.find((env: any) => env.env === selectedEnvKey) || { env: selectedEnvKey, name: selectedEnvKey }]
                    // : (customSecret?.variables as any[])?.map((secret) => {
                    //     const _env = envsToCollect?.find((env: any) => env.env === secret.key);
                    //     return _env ? _env : { env: secret.key, name: secret.key };
                    // }) ?? []
                }
                initialStep={envVariablesConfig?.findIndex((env: any) => env.env === selectedEnvKey) ?? 0}
                onSave={handleSaveCustomEnv}
                initialValues={(customSecret?.variables as any[])?.reduce((acc: Record<string, string>, secret: ClientSecretVariable) => {
                    acc[secret.key] = secret.value || "";
                    return acc;
                }, {} as Record<string, string>)}
            />
        </div>
    );
};
