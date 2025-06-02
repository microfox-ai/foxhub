import { DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { AlertTriangle, SettingsIcon, Trash2 } from "lucide-react"
import { DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { useState } from "react"
import { PortalSdk } from "@/utils/services/PortalSdk"
import { useClientProject } from "../../providers/ClientProjectProvider"
import { toast } from "sonner"
import useSWR from "swr"


export const RequestSettings = () => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
    const { selectedRequest } = useClientProject();

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handlePermanentDeleteClick = () => {
        setShowPermanentDeleteDialog(true);
    };

    const { data, mutate } = useSWR(`/api/client-requests/check-deployment?clientRequestId=${selectedRequest?.id}`, {
        fetcher: async (url: string) => {
            const res = await fetch(url);
            return res.json();
        }
    })
    const isDeploymentExists = data?.success;

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await PortalSdk.deleteData(`/api/client-requests/delete-deployment?id=${selectedRequest?.id}`, {})

            if (res.success) {
                toast.success("Request archived! This might take a while to reflect changes.");
            } else {
                toast.error("Failed to archive request");
            }
            mutate();
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("Error archiving request:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmPermanentDelete = async () => {
        setIsPermanentlyDeleting(true);
        try {
            const res = await PortalSdk.deleteData(`/api/client-requests/delete?id=${selectedRequest?.id}`, {})

            if (res.success) {
                toast.success("Request permanently deleted!");
                // You might want to redirect or handle the UI update here
            } else {
                toast.error("Failed to delete request");
            }
            mutate();
            setShowPermanentDeleteDialog(false);
        } catch (error) {
            console.error("Error deleting request:", error);
        } finally {
            setIsPermanentlyDeleting(false);
        }
    };

    return (
        <div>
            <div className="col-span-12 border-t border-neutral-200 pt-10 mb-[300px]">
                <div className="flex items-center gap-2 mb-6">
                    <SettingsIcon className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Request Settings
                    </h3>
                    <span className="text-sm text-gray-500">
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="border border-neutral-200 rounded-md p-4 bg-neutral-50">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-black mt-0.5" />
                            <div className="flex w-full justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-medium text-black">Archive Request</h3>
                                    <p className="text-sm text-neutral-600 mt-1">
                                        Archiving a request will stop all running deployments, but you can re-activate it at any time by redeploying it.
                                    </p>
                                </div>
                                <Button
                                    variant={isDeploymentExists ? "destructive" : "outline"}
                                    size="sm"
                                    className="mt-3"
                                    onClick={handleDeleteClick}
                                    disabled={isDeleting || !isDeploymentExists}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Archiving...
                                        </>
                                    ) : (
                                        isDeploymentExists ? "Archive Request" : "Request Archived"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="border border-red-200 rounded-md p-4 bg-red-50">
                        <div className="flex items-start gap-3">
                            <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex w-full justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-medium text-red-900">Delete Request</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        This action will permanently delete the request, all associated data, code, and deployments. This action cannot be undone.
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3"
                                    onClick={handlePermanentDeleteClick}
                                    disabled={isPermanentlyDeleting}
                                >
                                    {isPermanentlyDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Request"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Archive Request</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to archive this request? This will stop & delete all running deployments, but you can still restart if you want to later on.
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
                                    Archiving...
                                </>
                            ) : (
                                "Archive"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Request Permanently</DialogTitle>
                        <DialogDescription>
                            Are you absolutely sure you want to delete this request? This will permanently delete all data, code, and deployments associated with this request. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowPermanentDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmPermanentDelete} disabled={isPermanentlyDeleting}>
                            {isPermanentlyDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Permanently"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}