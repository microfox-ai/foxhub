import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { TaskInstanceMetaType } from "@/server/convertfox/types";


interface EditTaskInfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    taskInfo: TaskInstanceMetaType["taskInfo"];
    onSave: (updatedInfo: TaskInstanceMetaType["taskInfo"]) => Promise<void>;
}

export const EditTaskInfoDialog = ({
    isOpen,
    onClose,
    taskInfo,
    onSave,
}: EditTaskInfoDialogProps) => {
    const [editedInfo, setEditedInfo] = useState<TaskInstanceMetaType["taskInfo"]>(taskInfo);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (_editedInfo: TaskInstanceMetaType["taskInfo"]) => {
        try {
            setIsSaving(true);
            await onSave({ ...editedInfo, ..._editedInfo } as unknown as TaskInstanceMetaType["taskInfo"]);
            onClose();
        } catch (error) {
            console.error('Error saving task info:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const updatedData = Object.fromEntries(formData.entries());
        console.log("updatedData", updatedData);
        setEditedInfo((prev: any) => ({
            ...prev,
            ...(updatedData as unknown as TaskInstanceMetaType["taskInfo"])
        }));
        await handleSave(updatedData as unknown as TaskInstanceMetaType["taskInfo"]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Task Information</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor="name">Task Name</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={editedInfo?.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="goal">Goal</Label>
                        <Textarea
                            id="goal"
                            name="goal"
                            defaultValue={editedInfo?.goal}
                            placeholder="What is the main goal of this task?"
                            className="min-h-[100px]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="summary">Summary</Label>
                        <Textarea
                            id="summary"
                            name="summary"
                            defaultValue={editedInfo?.summary}
                            placeholder="Provide a detailed summary of the task"
                            className="min-h-[150px] max-h-[30vh] overflow-y-auto"
                            required
                        />
                    </div>

                    {/* Add any additional fields that might be present in the taskInfo object */}
                    {editedInfo && Object.entries(editedInfo).map(([key, value]: [string, any]) => {
                        if (key !== 'name' && key !== 'goal' && key !== 'summary') {
                            return (
                                <div key={key} className="space-y-2">
                                    <Label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                                    <Textarea
                                        id={key}
                                        name={key}
                                        defaultValue={value}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            );
                        }
                        return null;
                    })}

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}; 