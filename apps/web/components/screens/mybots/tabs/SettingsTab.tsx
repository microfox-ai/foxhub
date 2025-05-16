import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, SettingsIcon } from "lucide-react";
import { usePathname } from "next/navigation";

interface SettingsTabProps {
    mode: "create" | "edit";
    onDeleteBot?: () => Promise<void>;
    isDeleting?: boolean;
    botToEdit?: any; // Consider using a more specific type if available
}

const SettingsTab = ({
    mode,
    onDeleteBot,
    isDeleting = false,
    botToEdit,
}: SettingsTabProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const pathname = usePathname();

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (onDeleteBot) {
            await onDeleteBot();
            setShowDeleteDialog(false);
        }
    };

    return (
        <div className="space-y-6 pt-0">
            <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
            </h3>

            {mode === "edit" && botToEdit?.id && (
                <div className="border border-red-200 rounded-md p-4 bg-red-50 mt-8">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Danger Zone</h3>
                            <p className="text-sm text-red-600 mt-1">
                                {pathname.includes("my-bots") ? "Once you delete a bot, there is no going back. Please be certain." : "Once you remove data access, all running jobs will be stopped. Please be certain."}
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
                                    pathname.includes("my-bots") ? "Delete Bot" : "Remove Data Access"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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

export default SettingsTab;

