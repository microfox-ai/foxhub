"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { ClientSecretVariable } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { zodResolver } from "@hookform/resolvers/zod";
import { CLIENTSECRETSTATUS } from "@prisma/client";
import { useRouter } from "next/router";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Constructor, Package } from "../../Chat/message/types";
import { botFormSchema, BotFormValues } from "../types";
import { useSecret } from "./SecretProvider";

const useSecretFormContextInternal = () => {
    const { botToEdit, mode, refreshBotToEdit } = useSecret();
    const { selectedProject, selectedRequest } = useClientProject();
    const { user } = useAuth();
    const [packageInfo, setPackageInfo] = useState<Package | null>(null);
    const [selectedConstructor, setSelectedConstructor] = useState<Constructor | null>(null);

    const [isUpdating, setIsUpdating] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<BotFormValues>({
        resolver: zodResolver(botFormSchema),
        defaultValues: {
            botName: "",
            keys: {},
            config: {},
        },
        mode: "onChange",
    });

    // Pre-fill form for edit mode
    useEffect(() => {
        if (mode === "edit" && botToEdit) {
            const initialConfig = (botToEdit.botConfig as any[])?.reduce(
                (acc: Record<string, any>, curr: ClientSecretVariable) => ({
                    ...acc,
                    [curr.key]: curr.value || curr.defaultValue || "",
                }),
                {} as Record<string, any>
            );

            form.reset({
                botName: botToEdit?.name,
                keys:
                    botToEdit.variables?.reduce(
                        (acc: Record<string, string>, curr: any) => ({
                            ...acc,
                            [curr.key]: curr.value || "",
                        }),
                        {} as Record<string, string>
                    ) || {},
                config: initialConfig || {},
            });
        }
    }, [botToEdit, form, mode]);


    const handleDelete = async () => {
        if (!botToEdit?.id) {
            toast.error("Bot ID not found");
            return;
        }

        if (botToEdit.clientRequestIds.length > 0) {
            toast.error("Bot has running jobs. Please delete them first.");
            return;
        }

        if (botToEdit.clientDeploymentIds.length > 0) {
            toast.error("Bot has running deployments. Please delete them first.");
            return;
        }

        try {
            setIsDeleting(true);
            await PortalSdk.deleteData(
                `/api/client-secrets?id=${botToEdit.id}`,
                {}
            );
            toast.success("Bot deleted successfully!");
            refreshBotToEdit();
        } catch (error) {
            console.error("Error deleting bot:", error);
            toast.error("Failed to delete bot. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreate = async (data: BotFormValues) => {
        console.log(packageInfo, selectedConstructor)
        if (!selectedProject?.id || !selectedConstructor) {
            toast.error("Missing required information");
            return;
        }

        try {
            setIsUpdating(true);
            // Format required keys into variables array
            const variables = Object.entries(data.keys || {}).map(([key, value]) => ({
                key,
                value: value || "",
                isOptional: false,
            }));

            // Transform config data
            const defaultConfig = selectedConstructor.botConfig || [];
            let botConfig: ClientSecretVariable[] = [];

            (defaultConfig as any[]).forEach((configField: ClientSecretVariable) => {
                if (data.config?.[configField.key]) {
                    botConfig.push({
                        ...configField,
                        value: data.config?.[configField.key] || "",
                    });
                }
            });

            const clientSecretData = {
                botProjectId: selectedProject.id,
                name: data.botName,
                type: `${packageInfo?.name}/${selectedConstructor.name}`,
                variables,
                userId: user?.id,
                status: CLIENTSECRETSTATUS.FILLED,
                packageName: packageInfo?.name,
                packageConstructor: (selectedConstructor as Constructor).name,
                packageType: (selectedConstructor as Constructor).auth,
                botConfig,
                clientRequestId: selectedRequest?.id,
                addToClientRequest: true,
                updateDeployments: true,
            };

            await PortalSdk.postData(
                "/api/client-secrets",
                clientSecretData
            );
            toast.success("Bot created successfully!");
            refreshBotToEdit();
        } catch (error) {
            console.error("Error creating bot:", error);
            toast.error("Failed to create bot. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdate = async (data: BotFormValues) => {
        if (!selectedProject?.id || !selectedConstructor || !botToEdit?.id) {
            toast.error("Missing required information");
            return;
        }

        if (botToEdit.clientRequestIds.length > 0) {
            toast.info("Bot has running jobs. Upadating information in all running jobs.");
        }

        try {
            setIsUpdating(true);
            // Format required keys into variables array
            const variables = Object.entries(data.keys || {}).map(([key, value]) => ({
                key,
                value: value || "",
                isOptional: false,
            }));

            // Transform config data
            let botConfig = botToEdit.botConfig as any[] as ClientSecretVariable[];
            const defaultConfig = botToEdit.defaultConfig;
            defaultConfig.forEach((configField: ClientSecretVariable) => {
                if (data.config?.[configField.key]) {
                    if (
                        botConfig.find(
                            (c: ClientSecretVariable) => c.key === configField.key
                        )
                    ) {
                        botConfig = botConfig.map((c: ClientSecretVariable) =>
                            c.key === configField.key
                                ? { ...c, value: data.config?.[configField.key] }
                                : c
                        );
                    } else {
                        botConfig.push({
                            ...configField,
                            value: data.config?.[configField.key],
                        });
                    }
                }
            });

            const clientSecretData = {
                id: botToEdit.id,
                name: data.botName,
                variables,
                botConfig,
                clientRequestId: selectedRequest?.id,
                botProjectId: selectedProject.id,
                userId: user?.id,
                status: CLIENTSECRETSTATUS.FILLED,
                ...(selectedRequest?.id ? { addToClientRequest: true } : {}),
                updateDeployments: true,
            };

            await PortalSdk.putData("/api/client-secrets", clientSecretData);
            toast.success("Bot updated successfully!");
            refreshBotToEdit();
        } catch (error) {
            console.error("Error updating bot:", error);
            toast.error("Failed to update bot. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };


    const onSubmit = async (data: BotFormValues) => {
        if (mode === "create") {
            await handleCreate(data);
        } else {
            await handleUpdate(data);
        }
    };

    return {
        form,
        onSubmit,
        mode,
        isUpdating,
        isDeleting,
        handleDelete,
        packageInfo,
        selectedConstructor,
        setPackageInfo,
        setSelectedConstructor,
    };
};

const SecretFormContext = createContext<
    ReturnType<typeof useSecretFormContextInternal> | undefined
>(undefined);

export function SecretFormProvider({ children }: { children: ReactNode }) {
    const context = useSecretFormContextInternal();
    return (
        <SecretFormContext.Provider value={context}>
            {children}
        </SecretFormContext.Provider>
    );
}

export function useSecretForm() {
    const context = useContext(SecretFormContext);
    if (context === undefined) {
        throw new Error("useSecretForm must be used within a SecretFormProvider");
    }
    return context;
}