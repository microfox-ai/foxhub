import { useEffect, useState } from "react";
import { LayoutDashboard, AlertTriangle, Loader2 } from "lucide-react";
import useSWR from "swr";
import { ClientDeployment } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useTaskInstanceMetaContext } from "../../providers/TaskInstanceMetaProvider";
import { useClientProject } from "../../providers/ClientProjectProvider";
import { HttpMethod } from "../../PreviewWindow/types";
import { useLayout } from "../../providers/LayoutProvider";
import { useApiDoc } from "../../providers/ApiDocProvider";
import { DeployStatus } from "./DeployStatus";
import { EndpointsSection } from "./EndpointsSection";
import { DeployStep } from "@/server/convertfox/types";
import { SecretVault } from "./SecretVault";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const ConfigureTab = () => {
    const { clientRequestId } = useClientProject();
    const { handleRightCollapse } = useLayout();
    const {
        taskInstanceMeta,
        mutate: mutateTaskInstanceMeta,
        deploymentInfo,
    } = useTaskInstanceMetaContext();
    const {
        endpoints,
        isLoading,
        error,
        setSelectedEndpoint,
        setSelectedMethod,
    } = useApiDoc();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        mutateTaskInstanceMeta();
    }, []);

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            // Add your delete logic here
            // await deleteBot();
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("Error deleting bot:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEndpointClick = (endpoint: {
        path: string;
        method: HttpMethod;
    }) => {
        setSelectedEndpoint(endpoint.path);
        setSelectedMethod(endpoint.method);
        handleRightCollapse(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-12 gap-4 thin-scrollbar">
            <div className="col-span-12 flex items-center gap-2 mb-8">
                <LayoutDashboard className="w-5 h-5" />
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            </div>

            <div className="col-span-12">
                <DeployStatus
                />
            </div>

            <div className="col-span-6">
                <EndpointsSection
                    endpoints={endpoints}
                    isLoading={isLoading}
                    error={error}
                    onEndpointClick={handleEndpointClick}
                />
            </div>

            <div className="col-span-6">
                <SecretVault />
            </div>

            <div className="col-span-12 border-t border-neutral-200 pt-4 mt-8">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">
                    Bot Settings
                </h3>

                <div className="border border-red-200 rounded-md p-4 bg-red-50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Danger Zone</h3>
                            <p className="text-sm text-red-600 mt-1">
                                Once you delete a bot, there is no going back. Please be certain.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Bot"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Bot</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this bot? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ConfigureTab;