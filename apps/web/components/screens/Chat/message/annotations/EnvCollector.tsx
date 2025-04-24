import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ClientSecret } from "@prisma/client";
import { HelpCircle, Key, Plus, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useUser } from "@/utils/hooks/useUser";
import { ActionButtons } from "./ActionButtons";
import { EnvVariablesDialog } from "../EnvVariablesDialog";
import { Markdown } from "../markdown";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { MotionConfig } from "framer-motion";
import { ClientSecretVariable } from "@/server/types";
import { ClientSecretPackageType } from "@/server/types";

interface UIAnnotation {
    objectType: string;
    object: Record<string, any>;
    text?: string;
    persona?: string;
    buttons?: any[];
}

interface EnvCollectorProps {
    uiAnnotation: UIAnnotation;
    idx: number;
}

export const EnvCollector = ({
    uiAnnotation,
    idx,
}: EnvCollectorProps) => {
    const annotation = uiAnnotation as any;
    const [showAddEnvModal, setShowAddEnvModal] = useState(false);
    const [showDocDialog, setShowDocDialog] = useState(false);
    const [selectedEnv, setSelectedEnv] = useState<any>(null);
    const [envValues, setEnvValues] = useState<Record<string, string>>({});
    const params = useParams();
    const requestParamId = params?.request_id;
    const projectParamId = params?.project_id;
    const { user } = useUser();
    const { data: secretsData, mutate: mutateSecrets } = useSWR<{
        clientSecrets: ClientSecret[];
    }>(
        requestParamId
            ? `/api/client-secrets?clientRequestId=${requestParamId}&packageType=${ClientSecretPackageType.CUSTOM}`
            : null,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch secrets");
            return res.json();
        }
    );
    const customSecret = secretsData?.clientSecrets?.[0];

    // Populate form with existing values when secret is found
    useEffect(() => {
        if (customSecret?.variables) {
            const keyMap: Record<string, string> = {};
            (customSecret.variables as any[]).forEach((variable: ClientSecretVariable) => {
                keyMap[variable.key] = variable.value;
            });
            setEnvValues(keyMap);
        }
    }, [customSecret]);

    const clientSecretKeys = (customSecret?.variables as any[]);
    const envVariables = annotation.envVariablesCollect;
    // .filter((env: any) =>
    //   clientSecretKeys?.some((key) => key.key !== env.env && !env.isSameAs)
    // );

    const handleSaveEnv = async (values: Record<string, string>) => {
        try {
            const existingSecret = secretsData?.clientSecrets?.[0];
            const endpoint = "/api/client-secrets";
            const method = existingSecret ? "PUT" : "POST";

            const body = existingSecret
                ? {
                    id: existingSecret.id,
                    variables: Object.entries(values)
                        .filter(([_, value]) => value.trim())
                        .map(([key, value]) => ({
                            key,
                            value: value.trim(),
                            isOptional: false,
                        })),
                }
                : {
                    addToClientRequest: true,
                    clientRequestId: requestParamId,
                    botProjectId: projectParamId,
                    name: "custom_keys",
                    userId: user?.id,
                    type: "custom",
                    packageName: ClientSecretPackageType.CUSTOM,
                    packageConstructor: ClientSecretPackageType.CUSTOM,
                    packageType: ClientSecretPackageType.CUSTOM,
                    variables: Object.entries(values)
                        .filter(([_, value]) => value.trim())
                        .map(([key, value]) => ({
                            key,
                            value: value.trim(),
                            isOptional: false,
                        })),
                };

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error("Failed to save environment variables");
            }

            await mutateSecrets();
            toast.success(
                existingSecret
                    ? "Environment variables updated successfully"
                    : "Environment variables saved successfully"
            );
        } catch (error) {
            console.error("Error saving environment variables:", error);
            toast.error("Failed to save environment variables. Please try again.");
            throw error;
        }
    };

    const hasAllRequiredKeys = envVariables.every((env: any) => {
        // Only check if the key exists in backend data
        return (customSecret?.variables as any[])?.some(
            (variable) => variable.key === env.env && variable.value?.trim()
        );
    });

    if (envVariables.length === 0) {
        return null;
    }

    return (
        <>
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
                        {uiAnnotation.text}
                    </h3>
                    <p className="text-sm text-gray-500">
                        Please provide the following information to continue
                    </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {envVariables?.map((env: any) => (
                        <div
                            key={env.env + env.name}
                            className="flex items-center justify-between  pb-3 last:border-b-0 last:pb-0"
                        >
                            <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-900">{env.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TooltipProvider delayDuration={3000}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-md border border-blue-100 bg-blue-50 hover:bg-blue-100"
                                                onClick={() => {
                                                    setSelectedEnv(env);
                                                    setShowDocDialog(true);
                                                }}
                                            >
                                                <HelpCircle className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="right"
                                            className="max-w-[250px] text-xs bg-blue-50 text-blue-900 border border-blue-100 shadow-sm px-3 py-2 [&>svg]:hidden"
                                            showArrow={false}
                                        >
                                            <p>Click for detailed documentation</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Button
                            variant="outline"
                            className="text-blue-500 hover:bg-blue-50 border-blue-100 bg-blue-50 hover:text-blue-600 transition"
                            onClick={() => setShowAddEnvModal(true)}
                        >
                            <Plus className="w-4 h-4 " />
                            {!hasAllRequiredKeys ? "Add the keys" : "Update the keys"}
                        </Button>
                        {!hasAllRequiredKeys ? (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 animate-pulse" />
                        ) : (
                            <CheckCircle2 className="absolute bg-green-50 -top-1 -right-1 h-5 w-5 rounded-full text-green-500" />
                        )}
                    </div>
                </div>

                {hasAllRequiredKeys && (
                    <ActionButtons
                        buttons={uiAnnotation.buttons}
                        areKeysRequired={envVariables.length > 0}
                        areKeysFilled={hasAllRequiredKeys}
                    />
                )}
            </motion.div>

            <EnvVariablesDialog
                isOpen={showAddEnvModal}
                onClose={() => setShowAddEnvModal(false)}
                envVariables={envVariables}
                onSave={handleSaveEnv}
                initialValues={envValues}
            />

            <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                            <HelpCircle className="h-5 w-5" />
                            {selectedEnv?.name} Documentation
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Detailed information about this environment variable
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">Description</h4>
                            <p className="text-sm text-gray-600">{selectedEnv?.what}</p>
                        </div>

                        {selectedEnv?.how && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-900">How to Set Up</h4>
                                <div className="space-y-3">
                                    {selectedEnv.how
                                        .split("\n")
                                        .map((line: string, i: number) => (
                                            <div key={line + i} className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 prose prose-sm max-w-none">
                                                    <Markdown>{line}</Markdown>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {selectedEnv?.examples && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-900">Examples</h4>
                                <div className="space-y-2">
                                    {selectedEnv.examples.map((example: string, i: number) => (
                                        <div
                                            key={example + i}
                                            className="bg-gray-50 p-3 rounded-md"
                                        >
                                            <Markdown>{example}</Markdown>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}; 