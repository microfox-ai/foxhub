import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ExtraEnvVariable } from "@/server/convertfox/helpers/types";
import { cn } from "@/lib/utils";
import { EnvVariableInput } from "./EnvVariableInput";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface EnvConfigurationEditorProps {
    initialValues?: ExtraEnvVariable;
    onSubmit: (values: ExtraEnvVariable) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
    mode: 'add' | 'edit';
    onDelete?: () => void;
    existingEnvKeys: string[];
}

export function EnvConfigurationEditor({
    initialValues,
    onSubmit,
    onCancel,
    isSubmitting,
    mode,
    onDelete,
    existingEnvKeys
}: EnvConfigurationEditorProps) {
    const [config, setConfig] = useState<ExtraEnvVariable>(initialValues || {
        env: "",
        name: "",
        what: "",
        how: "",
        why: "",
        ui: {
            type: "input",
            options: [],
            defaultValue: "",
        },
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [envError, setEnvError] = useState<string | null>(null);
    const [previewValue, setPreviewValue] = useState("");
    const [isInputFocused, setIsInputFocused] = useState(false);

    const handleChange = (field: keyof ExtraEnvVariable, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));

        // Validate env key uniqueness when env field changes
        if (field === 'env') {
            const normalizedValue = value?.trim().toUpperCase();
            if (existingEnvKeys.includes(normalizedValue) && normalizedValue !== initialValues?.env) {
                setEnvError("This environment variable key already exists");
            } else {
                setEnvError(null);
            }
        }
    };

    const handleUIChange = (field: keyof NonNullable<ExtraEnvVariable['ui']>, value: any) => {
        setConfig(prev => ({
            ...prev,
            ui: {
                ...prev.ui,
                [field]: value
            } as NonNullable<ExtraEnvVariable['ui']>
        }));
    };

    const handleSubmit = async () => {
        if (!config.env || !config.name) {
            toast.error("Please fill in all required fields");
            return;
        }

        const normalizedEnv = config?.env?.trim()?.toUpperCase();
        if (existingEnvKeys.includes(normalizedEnv) && normalizedEnv !== initialValues?.env) {
            setEnvError("This environment variable key already exists");
            return;
        }

        await onSubmit({
            ...config,
            env: normalizedEnv
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-2xl font-medium text-gray-900">
                    {mode === 'add' ? 'Add New Environment Variable' : 'Edit Environment Variable'}
                </h3>
                <p className="text-gray-600">
                    {mode === 'add' ? 'Create a new custom environment variable for your project.' : 'Update the environment variable configuration.'}
                </p>
            </div>

            <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="info">Configure Info</TabsTrigger>
                    <TabsTrigger value="ui">Configure UI</TabsTrigger>
                    <TabsTrigger value="preview">Preview UI</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="env">Environment Variable Key</Label>
                            <Input
                                id="env"
                                value={config.env}
                                onChange={(e) => handleChange("env", e.target.value)}
                                placeholder="e.g., API_KEY"
                                className={cn("h-11", envError && "border-red-500 focus-visible:ring-red-200")}
                            />
                            {envError && (
                                <div className="flex items-center gap-1 text-red-500 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>{envError}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                value={config.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="e.g., API Key"
                                className="h-11"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="what">Description</Label>
                        <Textarea
                            id="what"
                            value={config.what}
                            onChange={(e) => handleChange("what", e.target.value)}
                            placeholder="What is this environment variable used for?"
                            className="min-h-[50px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="why">Additional Context (Optional)</Label>
                        <Textarea
                            id="why"
                            value={config.why}
                            onChange={(e) => handleChange("why", e.target.value)}
                            placeholder="Why this environment variable is needed"
                            className="min-h-[50px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="how">Setup Instructions (How to setup)</Label>
                        <Textarea
                            id="how"
                            value={config.how}
                            onChange={(e) => handleChange("how", e.target.value)}
                            placeholder="Step by step instructions on how to obtain this value"
                            className="min-h-[100px]"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="ui" className="space-y-4 mt-4">
                    <div className="flex  gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ui-type">Input Type</Label>
                            <Select
                                value={config.ui?.type || "input"}
                                onValueChange={(value) => handleUIChange("type", value)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select input type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="input">Text Input</SelectItem>
                                    <SelectItem value="select">Dropdown Select</SelectItem>
                                    <SelectItem value="multi-select">Multi Select</SelectItem>
                                    <SelectItem value="text-array">Text Array</SelectItem>
                                    <SelectItem value="textarea">Text Area</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ui-default">Default Value</Label>
                            <Input
                                id="ui-default"
                                value={config.ui?.defaultValue || ""}
                                onChange={(e) => handleUIChange("defaultValue", e.target.value)}
                                placeholder="Enter default value"
                            />
                        </div>


                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ui-placeholder">Placeholder</Label>
                        <Input
                            id="ui-placeholder"
                            value={config.ui?.placeholder || ""}
                            onChange={(e) => handleUIChange("placeholder", e.target.value)}
                            placeholder="Enter placeholder text"
                        />
                    </div>

                    {(config.ui?.type === "select" || config.ui?.type === "multi-select") && (
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="ui-options">Options</Label>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {config.ui?.options?.map((option, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                            {option}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newOptions = [...(config.ui?.options || [])];
                                                    newOptions.splice(index, 1);
                                                    handleUIChange("options", newOptions);
                                                }}
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Remove option</span>
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Command className="rounded-lg border shadow-md">
                                        <CommandInput
                                            placeholder="Add options by typing & pressing Enter..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value) {
                                                    e.preventDefault();
                                                    const newOption = e.currentTarget?.value?.trim();
                                                    if (newOption && !config.ui?.options?.includes(newOption)) {
                                                        handleUIChange("options", [...(config.ui?.options || []), newOption]);
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                            onFocus={() => setIsInputFocused(true)}
                                            onBlur={() => setIsInputFocused(false)}
                                        />
                                    </Command>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            const input = document.querySelector('input[cmdk-input]') as HTMLInputElement;
                                            if (input?.value?.trim()) {
                                                const newOption = input?.value?.trim();
                                                if (!config.ui?.options?.includes(newOption)) {
                                                    handleUIChange("options", [...(config.ui?.options || []), newOption]);
                                                    input.value = '';
                                                }
                                            }
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="sr-only">Add option</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ui-required"
                                checked={config.ui?.required}
                                onCheckedChange={(checked) => handleUIChange("required", checked)}
                            />
                            <Label htmlFor="ui-required">Required</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ui-secret"
                                checked={config.ui?.isSecret}
                                onCheckedChange={(checked) => handleUIChange("isSecret", checked)}
                            />
                            <Label htmlFor="ui-secret">Secret</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ui-hidden"
                                checked={config.ui?.isHidden}
                                onCheckedChange={(checked) => handleUIChange("isHidden", checked)}
                            />
                            <Label htmlFor="ui-hidden">Hidden</Label>
                        </div>
                    </div> */}
                </TabsContent>

                <TabsContent value="preview" className="space-y-4 mt-4">
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-lg font-medium mb-4">Preview</h4>
                            <p className="text-sm text-gray-500 mb-4">
                                See how your environment variable input will look and behave in the UI.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <EnvVariableInput
                                type={config?.ui?.type || "input"}
                                value={previewValue || config.ui?.defaultValue || ""}
                                onChange={setPreviewValue}
                                options={config.ui?.options}
                                placeholder={config.ui?.placeholder}
                                defaultValue={config.ui?.defaultValue}
                                className="w-full"
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-between gap-3 pt-4">
                <div className="flex gap-3">
                    {mode === 'edit' && onDelete && (
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    {mode === 'add' ? 'Add Variable' : 'Save Changes'}
                </Button>
            </div>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Configuration</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this configuration? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDelete?.();
                                setShowDeleteConfirm(false);
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
