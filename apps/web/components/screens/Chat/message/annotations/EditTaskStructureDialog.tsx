import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageIcon, GitFork, FileText, Edit, Plus, ChevronDown, ListIcon, InfoIcon, TargetIcon, Trash2, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditTaskStructureDialogProps {
    isOpen: boolean;
    onClose: () => void;
    taskStructure: TaskInstanceMetaType["taskStructure"];
    onSave: (updatedStructure: TaskInstanceMetaType["taskStructure"]) => Promise<void>;
}

export const EditTaskStructureDialog = ({
    isOpen,
    onClose,
    taskStructure,
    onSave,
}: EditTaskStructureDialogProps) => {
    const [editedStructure, setEditedStructure] = useState<TaskInstanceMetaType["taskStructure"]>(taskStructure);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>("lambdaFunctions");
    const [itemToDelete, setItemToDelete] = useState<{ type: string; index: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await onSave(editedStructure);
            onClose();
        } catch (error) {
            console.error('Error saving task structure:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!itemToDelete) return;
        if (!editedStructure) return;

        const newStructure = { ...editedStructure };

        switch (itemToDelete.type) {
            case 'lambda':
                if (newStructure.lambdaFunctions) {
                    newStructure.lambdaFunctions = newStructure.lambdaFunctions.filter((_, i) => i !== itemToDelete.index);
                }
                break;
            case 'cron':
                if (newStructure.cronJobs) {
                    newStructure.cronJobs = newStructure.cronJobs.filter((_, i) => i !== itemToDelete.index);
                }
                break;
            case 'schema':
                if (newStructure.dbSchemas) {
                    newStructure.dbSchemas = newStructure.dbSchemas.filter((_, i) => i !== itemToDelete.index);
                }
                break;
        }
        setEditedStructure(newStructure);
        setItemToDelete(null);
    };

    if (!editedStructure) return null;

    const renderItemList = () => {
        switch (activeTab) {
            case "lambdaFunctions":
                return (
                    <Accordion type="single" collapsible className="w-full">
                        {editedStructure.lambdaFunctions?.map((fn, index) => (
                            <AccordionItem key={fn.name} value={fn.name}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-start justify-between w-full pr-4">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{index + 1}. {fn.name}</span>
                                            <span className="text-[10px] text-gray-400">{fn.method} {fn.path}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItem({ type: 'lambda', data: fn, index });
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemToDelete({ type: 'lambda', index });
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className=" space-y-2">
                                        {fn.brief && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <ListIcon className="w-4 h-4 mr-2 inline-block" />
                                                    Brief</p>
                                                <p className="text-sm text-gray-500">{fn.brief}</p>
                                            </div>
                                        )}
                                        {fn.description && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <InfoIcon className="w-4 h-4 mr-2 inline-block" />
                                                    Description</p>
                                                <p className="text-sm text-gray-500">{fn.description}</p>
                                            </div>
                                        )}
                                        {fn.endResult && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <TargetIcon className="w-4 h-4 mr-2 inline-block" />
                                                    End Result</p>
                                                <p className="text-sm text-gray-500">{fn.endResult}</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                );
            case "cronJobs":
                return (
                    <Accordion type="single" collapsible className="w-full">
                        {editedStructure.cronJobs?.map((job, index) => (
                            <AccordionItem key={job.name} value={job.name}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-start justify-between w-full pr-4">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{index + 1}. {job.name}</span>
                                            <span className="text-[10px] text-gray-400">{job.cronExpression}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItem({ type: 'cron', data: job, index });
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemToDelete({ type: 'cron', index });
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {job.brief && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <ListIcon className="w-4 h-4 mr-2 inline-block" />
                                                    Brief</p>
                                                <p className="text-sm text-gray-500">{job.brief}</p>
                                            </div>
                                        )}
                                        {job.description && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <InfoIcon className="w-4 h-4 mr-2 inline-block" />
                                                    Description</p>
                                                <p className="text-sm text-gray-500">{job.description}</p>
                                            </div>
                                        )}
                                        {job.endResult && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <TargetIcon className="w-4 h-4 mr-2 inline-block" />
                                                    End Result</p>
                                                <p className="text-sm text-gray-500">{job.endResult}</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                );
            case "schemas":
                return (
                    <Accordion type="single" collapsible className="w-full">
                        {editedStructure.dbSchemas?.map((schema, index) => (
                            <AccordionItem key={schema.modelName} value={schema.modelName}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-start justify-between w-full pr-4">
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{index + 1}. {schema.modelName}</span>
                                            <span className="text-[10px] text-gray-400">Database Schema</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItem({ type: 'schema', data: schema, index });
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemToDelete({ type: 'schema', index });
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {schema.key && (
                                            <div className="mb-2 flex flex-col gap-1">
                                                <p className="text-sm font-medium text-gray-700">
                                                    <ListIcon className="w-4 h-4 mr-2 inline-block" />
                                                    Brief</p>
                                                <p className="text-sm text-gray-500">{schema.key}</p>
                                            </div>
                                        )}
                                        <div className="mb-2 flex flex-col gap-1">
                                            <p className="text-sm font-medium text-gray-700">
                                                <InfoIcon className="w-4 h-4 mr-2 inline-block" />
                                                Schema Definition</p>
                                            <pre className="text-xs bg-gray-50 p-3 rounded-md border overflow-x-auto mt-1">
                                                {JSON.stringify(schema.jsonSchema, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                );
            default:
                return null;
        }
    };

    const renderEditForm = () => {
        if (!selectedItem) return null;

        const handleFormSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const updatedData = Object.fromEntries(formData.entries());

            const newStructure = { ...editedStructure };
            switch (selectedItem.type) {
                case 'lambda':
                    if (newStructure.lambdaFunctions) {
                        newStructure.lambdaFunctions[selectedItem.index] = {
                            ...selectedItem.data,
                            ...updatedData
                        };
                    }
                    break;
                case 'cron':
                    if (newStructure.cronJobs) {
                        newStructure.cronJobs[selectedItem.index] = {
                            ...selectedItem.data,
                            ...updatedData
                        };
                    }
                    break;
                case 'schema':
                    if (newStructure.dbSchemas) {
                        newStructure.dbSchemas[selectedItem.index] = {
                            ...selectedItem.data,
                            ...updatedData
                        };
                    }
                    break;
            }
            setEditedStructure(newStructure);
            setSelectedItem(null);
        };

        return (
            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {selectedItem.type === 'lambda' ? 'Webhook' : selectedItem.type === 'cron' ? 'Scheduled Job' : 'Schema'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                        {selectedItem.type === 'lambda' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" name="name" defaultValue={selectedItem.data.name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="method">Method</Label>
                                    <Select name="method" defaultValue={selectedItem.data.method}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GET">GET</SelectItem>
                                            <SelectItem value="POST">POST</SelectItem>
                                            <SelectItem value="PUT">PUT</SelectItem>
                                            <SelectItem value="DELETE">DELETE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="path">Path</Label>
                                    <Input id="path" name="path" defaultValue={selectedItem.data.path} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea id="description" name="description" defaultValue={selectedItem.data.description} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brief">Brief</Label>
                                    <Textarea id="brief" name="brief" defaultValue={selectedItem.data.brief} />
                                </div>
                            </>
                        )}
                        {selectedItem.type === 'cron' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" name="name" defaultValue={selectedItem.data.name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cronExpression">Cron Expression</Label>
                                    <Input id="cronExpression" name="cronExpression" defaultValue={selectedItem.data.cronExpression} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea id="description" name="description" defaultValue={selectedItem.data.description} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brief">Brief</Label>
                                    <Textarea id="brief" name="brief" defaultValue={selectedItem.data.brief} />
                                </div>
                            </>
                        )}
                        {selectedItem.type === 'schema' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="modelName">Model Name</Label>
                                    <Input id="modelName" name="modelName" defaultValue={selectedItem.data.modelName} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="jsonSchema">JSON Schema</Label>
                                    <Textarea
                                        id="jsonSchema"
                                        name="jsonSchema"
                                        defaultValue={JSON.stringify(selectedItem.data.jsonSchema, null, 2)}
                                        className="font-mono max-h-[30vh] overflow-y-auto"
                                    />
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setSelectedItem(null)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Task Structure</DialogTitle>
                </DialogHeader>

                <div className="mt-4 flex-1 overflow-y-auto">
                    <Tabs
                        defaultValue="lambdaFunctions"
                        className="w-full"
                        onValueChange={setActiveTab}
                    >
                        <TabsList className="flex flex-row gap-2 justify-start items-center bg-gray-50/50 p-1 rounded-lg">
                            {editedStructure.lambdaFunctions?.length > 0 && (
                                <TabsTrigger value="lambdaFunctions" className="data-[state=active]:bg-white !px-2">
                                    <PackageIcon className="w-4 h-4" />
                                    Webhooks
                                </TabsTrigger>
                            )}
                            {editedStructure.cronJobs?.length > 0 && (
                                <TabsTrigger value="cronJobs" className="data-[state=active]:bg-white !px-2">
                                    <GitFork className="w-4 h-4" />
                                    Scheduled-Jobs
                                </TabsTrigger>
                            )}
                            {editedStructure.dbSchemas && editedStructure.dbSchemas?.length > 0 && (
                                <TabsTrigger value="schemas" className="data-[state=active]:bg-white !px-2">
                                    <FileText className="w-4 h-4" />
                                    Datastore
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="lambdaFunctions" className="">
                            <div className="space-y-4">
                                {renderItemList()}
                                <Button variant="outline" className="w-full" onClick={() => setSelectedItem({ type: 'lambda', data: {}, index: -1 })}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Webhook
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="cronJobs" className="">
                            <div className="space-y-4">
                                {renderItemList()}
                                <Button variant="outline" className="w-full" onClick={() => setSelectedItem({ type: 'cron', data: {}, index: -1 })}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Scheduled Job
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="schemas" className="">
                            <div className="space-y-4">
                                {renderItemList()}
                                <Button variant="outline" className="w-full" onClick={() => setSelectedItem({ type: 'schema', data: {}, index: -1 })}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Schema
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
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

                <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the selected item.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {renderEditForm()}
            </DialogContent>
        </Dialog>
    );
}; 