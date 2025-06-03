import { DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { AlertTriangle, SettingsIcon, ShieldAlertIcon, Trash2, CreditCard } from "lucide-react"
import { DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { useState } from "react"
import { PortalSdk } from "@/utils/services/PortalSdk"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { IN_STAGING } from "@/utils/constants/appInfo"
import { useClientProject } from "../../providers/ClientProjectProvider"

export const SecuritySettings = () => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { selectedProject } = useClientProject();
    const router = useRouter();

    // TODO: Replace with actual billing status check
    const hasUnpaidBills = IN_STAGING ? false : true; // This will be replaced with actual billing status check

    const handleDeleteClick = () => {
        if (hasUnpaidBills) {
            toast.error("Cannot delete project with unpaid bills. Please settle all payments first.");
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (hasUnpaidBills) {
            toast.error("Cannot delete project with unpaid bills. Please settle all payments first.");
            return;
        }

        setIsDeleting(true);
        try {
            const res = await PortalSdk.deleteData(`/api/bot-project/delete-all?id=${selectedProject?.id}`, {})

            if (res.success) {
                toast.success("Project permanently deleted!");
                router.push("/dashboard");
            } else {
                toast.error("Failed to delete project");
            }
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("Error deleting project:", error);
            toast.error("An error occurred while deleting the project");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="transition-all duration-300 hover:shadow-lg">
            <div className="col-span-12 px-4 mb-[200px]">
                <div className="flex items-center gap-2 mb-6">
                    <ShieldAlertIcon className="w-4 h-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Security Settings
                    </h3>
                </div>

                <div className="space-y-4">
                    <div className="border border-neutral-200 rounded-md p-4 bg-neutral-50">
                        <div className="flex items-start gap-3">
                            <Trash2 className="h-5 w-5 text-black mt-0.5" />
                            <div className="flex w-full justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-medium text-black">Delete Project</h3>
                                    <p className="text-sm text-neutral-600 mt-1">
                                        This action will permanently delete the project, all associated data, code, and deployments. This action cannot be undone.
                                    </p>
                                    {hasUnpaidBills && (
                                        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                                            <CreditCard className="h-4 w-4" />
                                            <span>Cannot delete project with unpaid bills. Please settle all payments first.</span>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3"
                                    onClick={handleDeleteClick}
                                    disabled={isDeleting || hasUnpaidBills}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Project"
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
                        <DialogTitle>Delete Project Permanently</DialogTitle>
                        <DialogDescription>
                            Are you absolutely sure you want to delete this project? This will permanently delete all data, code, and deployments associated with this project. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting || hasUnpaidBills}>
                            {isDeleting ? (
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
        </Card>
    )
}
