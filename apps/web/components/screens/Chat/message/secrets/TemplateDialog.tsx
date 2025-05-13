import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CLIENTSECRETSTATUS, ClientSecret, ClientSecretTemplate } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { KeyedMutator } from "swr";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Constructor } from "../types";
import { OAuthButton } from "./OAuthButton";
import { SecretTemplateMetadata } from "@/components/screens/secretTemplates/SecretTemplates";

interface TemplateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCancel: () => void;
    selectedTemplate: ClientSecretTemplate | null;
    secretsData?: {
        clientSecrets: ClientSecret[];
        clientSecretTemplates: ClientSecretTemplate[];
    };
    packageInfo: any;
    mutateSecrets: KeyedMutator<{
        clientSecrets: any[];
    }>;
    mutateBotSecrets: KeyedMutator<{
        clientSecrets: any[];
        clientSecretTemplates: ClientSecretTemplate[];
    }>;
}

export const TemplateDialog = ({
    isOpen,
    onClose,
    onCancel,
    selectedTemplate,
    packageInfo,
    secretsData,
    mutateSecrets,
    mutateBotSecrets,
}: TemplateDialogProps) => {

    const { selectedProject, selectedRequest } = useClientProject();
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const templateConstructor = selectedTemplate?.packageConstructor;
    const templateConstructorInfo = packageInfo?.constructors.find((constructor: Constructor) => constructor.name === templateConstructor);
    const authType = templateConstructorInfo?.auth;


    const handleConfirm = async () => {
        try {
            setIsSaving(true);

            if (!selectedProject || !selectedRequest) {
                toast.error("Please select a project and request");
                return;
            }

            if (secretsData?.clientSecretTemplates?.find((secret) => secret.templateId === selectedTemplate?.id)) {
                toast.error("You already have a related connection.");
                return;
            }

            const clientSecretData = {
                botProjectId: selectedProject.id,
                name: selectedTemplate?.name,
                type: selectedTemplate?.type,
                variables: selectedTemplate?.variables,
                userId: user?.id,
                status: CLIENTSECRETSTATUS.FILLED,
                packageName: selectedTemplate?.packageName,
                packageConstructor: selectedTemplate?.packageConstructor,
                packageType: selectedTemplate?.packageType,
                botConfig: selectedTemplate?.botConfig,
                clientRequestId: selectedRequest?.id,
                addToClientRequest: true,
                updateDeployments: true,
                isHidden: true,
                templateId: selectedTemplate?.id,
            };
            // Create a new client secret from the template
            await PortalSdk.postData("/api/client-secrets", clientSecretData);
            toast.success("Connection successfull!");

            await mutateSecrets();
            await mutateBotSecrets();
            onClose();
        } catch (error) {
            console.error("Error creating secret from template:", error);
            toast.error("Failed to create secret");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-4 mb-4 text-xl font-semibold">
                        <img src={packageInfo?.icon} className="h-8 w-8" />
                        <div className="flex flex-col">
                            <span className="text-xl font-medium">
                                {packageInfo?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                Confirm to use Microfox's secret for your {packageInfo?.name} integration
                            </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {selectedTemplate && (
                        <div className="space-y-2">
                            <h4 className="text-3xl font-medium">Hello, {user?.name}</h4>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <p className="text-sm">
                                    You are trying to connect to {packageInfo?.title} using {" "}
                                    {selectedTemplate?.name}
                                    <br />
                                    <br />
                                    {(selectedTemplate?.metadata as any as SecretTemplateMetadata)?.introMessage || "This integratind comes in packed with Microfox's servers and maybe applicable for additional charges.."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    {authType === "oauth" ? (
                        <OAuthButton
                            packageInfo={packageInfo}
                            mutateSecrets={mutateSecrets}
                            secretsData={secretsData}
                        />
                    ) : (
                        <Button
                            onClick={handleConfirm}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Confirm"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 