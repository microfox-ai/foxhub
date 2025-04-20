import { ClientSecret } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export const DeleteConfirmationDialog = ({
    secretToDelete,
    onClose,
    onDelete,
}: {
    secretToDelete: ClientSecret;
    onClose: () => void;
    onDelete: () => void;
}) => {
    return (
        <Dialog open={!!secretToDelete} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Secret</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete {secretToDelete?.name}
                        &nbsp;secrets? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};