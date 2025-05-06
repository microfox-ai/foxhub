"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientSecretTemplate } from "@prisma/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Package } from "../Chat/message/types";
import { ClientSecretVariable, PackageStatus } from "@/server/types";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/auth/AuthProvider";
import { IN_DEV } from "@/utils/constants/appInfo";

export const SecretTemplates = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ClientSecretTemplate | null>(null);
    const [formData, setFormData] = useState<{
        templateId: string;
        name: string;
        type: string;
        templateType: string;
        variables: ClientSecretVariable[];
        botConfig: ClientSecretVariable[];
        packageName: string;
        packageConstructor: string;
        packageType: string;
    }>({
        templateId: "",
        name: "",
        type: "",
        templateType: "free",
        variables: [],
        botConfig: [],
        packageName: "",
        packageConstructor: "",
        packageType: "",
    });

    const { user } = useAuth();
    // Fetch packages data
    const { data: packages } = useSWR<Package[]>(
        `/api/packages/infos?packageTypes=${PackageStatus.STABLE},${PackageStatus.EXTERNAL},${PackageStatus.SEMISTABLE}`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        }
    );
    const packagesData = {
        packages: packages || []
    }

    // Get unique package types from packages
    const packageTypes = Array.from(
        new Set(
            packagesData?.packages
                ?.filter((pkg) => pkg.name === formData.packageName)
                .map((pkg) => pkg.constructors?.map((c) => c.auth) as any)
                .flat()
                .concat(["custom", "template"])
                .filter(Boolean) || [],
        )
    );

    // Get constructors for selected package
    const packageConstructors = packagesData?.packages
        .find((pkg) => pkg.name === formData.packageName)
        ?.constructors?.map((c) => c.name) || [];

    // Get available variables and configs for selected package and constructor
    const availableVariables = packagesData?.packages
        .find((pkg) => pkg.name === formData.packageName)
        ?.constructors?.find((c) => c.name === formData.packageConstructor)
        ?.requiredKeys || [];

    const availableBotConfigs = packagesData?.packages
        .find((pkg) => pkg.name === formData.packageName)
        ?.constructors?.find((c) => c.name === formData.packageConstructor)
        ?.botConfig || [];

    const { data: templates, mutate } = useSWR<{ clientSecretTemplates: ClientSecretTemplate[] }>(
        "/api/client-secrets/templates",
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch templates");
            return res.json();
        }
    );

    const handleCreate = async () => {
        try {
            const response = await fetch("/api/client-secrets/templates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    type: formData.packageType === "custom" ? "custom" :
                        formData.packageType === "template" ? "template" :
                            `${formData.packageName}/${formData.packageConstructor}`,
                    variables: formData.variables,
                    botConfig: formData.botConfig,
                }),
            });

            if (!response.ok) throw new Error("Failed to create template");

            await mutate();
            setIsCreateDialogOpen(false);
            setFormData({
                templateId: "",
                name: "",
                type: "",
                templateType: "free",
                variables: [],
                botConfig: [],
                packageName: "",
                packageConstructor: "",
                packageType: "",
            });
            toast.success("Template created successfully");
        } catch (error) {
            toast.error("Failed to create template");
        }
    };

    const handleEdit = async () => {
        if (!selectedTemplate) return;

        try {
            const response = await fetch(`/api/client-secrets/templates?id=${selectedTemplate.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    type: formData.packageType === "custom" ? "custom" :
                        formData.packageType === "template" ? "template" :
                            `${formData.packageName}/${formData.packageConstructor}`,
                    variables: formData.variables,
                    botConfig: formData.botConfig,
                }),
            });

            if (!response.ok) throw new Error("Failed to update template");

            await mutate();
            setIsEditDialogOpen(false);
            setSelectedTemplate(null);
            toast.success("Template updated successfully");
        } catch (error) {
            toast.error("Failed to update template");
        }
    };

    const handleDelete = async () => {
        if (!selectedTemplate) return;

        try {
            const response = await fetch(`/api/client-secrets/templates?id=${selectedTemplate.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete template");

            await mutate();
            setIsDeleteDialogOpen(false);
            setSelectedTemplate(null);
            toast.success("Template deleted successfully");
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const openEditDialog = (template: ClientSecretTemplate) => {
        setSelectedTemplate(template);
        setFormData({
            templateId: template.templateId,
            name: template.name,
            type: template.type,
            templateType: template.templateType || "free",
            variables: template.variables as any[] as ClientSecretVariable[],
            botConfig: template.botConfig as any[] as ClientSecretVariable[],
            packageName: template.packageName || "",
            packageConstructor: template.packageConstructor || "",
            packageType: template.packageType || "",
        });
        setIsEditDialogOpen(true);
    };

    const addVariable = () => {
        setFormData({
            ...formData,
            variables: [
                ...formData.variables,
                {
                    key: "",
                    value: "",
                    isOptional: false,
                    ui: {
                        type: "text",
                        label: "",
                        placeholder: "Enter value"
                    }
                },
            ],
        });
    };

    const removeVariable = (index: number) => {
        setFormData({
            ...formData,
            variables: formData.variables.filter((_, i) => i !== index),
        });
    };

    const updateVariable = (index: number, field: keyof ClientSecretVariable, value: string | boolean) => {
        setFormData({
            ...formData,
            variables: formData.variables.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            ),
        });
    };

    const addBotConfig = () => {
        setFormData({
            ...formData,
            botConfig: [
                ...formData.botConfig,
                {
                    key: "",
                    value: "",
                    isOptional: false,
                    ui: {
                        type: "text",
                        label: "",
                        placeholder: "Enter value"
                    }
                },
            ],
        });
    };

    const removeBotConfig = (index: number) => {
        setFormData({
            ...formData,
            botConfig: formData.botConfig.filter((_, i) => i !== index),
        });
    };

    const updateBotConfig = (index: number, field: keyof ClientSecretVariable, value: string | boolean) => {
        setFormData({
            ...formData,
            botConfig: formData.botConfig.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            ),
        });
    };

    const generateTemplateId = () => {
        const randomId = Math.random().toString(36).substring(2, 10);
        setFormData({ ...formData, templateId: formData.name.replace(/[^a-zA-Z0-9]/g, "-")?.toLowerCase() + "-" + randomId });
    };

    // Generate initial template ID
    useEffect(() => {
        generateTemplateId();
    }, []);


    if (!user?.email?.includes("@themoondevs.com") && !IN_DEV) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold">Secret Templates</h1>
                <p>You are not authorized to access this page. Become a Moon Dev to get access.</p>
            </div>
        )
    }


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Secret Templates</h1>
                <Button onClick={() => {
                    setIsCreateDialogOpen(true)
                    setFormData({
                        templateId: "",
                        name: "",
                        type: "",
                        templateType: "free",
                        variables: [],
                        botConfig: [],
                        packageName: "",
                        packageConstructor: "",
                        packageType: "",
                    })
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                </Button>
            </div>

            <div className="grid gap-4">
                {templates?.clientSecretTemplates.map((template) => (
                    <div
                        key={template.id}
                        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold">{template.name}</h3>
                                <p className="text-sm text-gray-500">Type: {template.type}</p>
                                <p className="text-sm text-gray-500">
                                    Variables: {(template.variables as any[] as ClientSecretVariable[]).length}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(template)}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTemplate(template);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="min-w-[80vw] h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Secret Template</DialogTitle>
                        <DialogDescription>
                            Create a new secret template for managing API keys and other sensitive data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        <div className="col-span-1">
                            <div className="flex gap-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="templateType">Template Type</Label>
                                    <Select
                                        value={formData.templateType}
                                        onValueChange={(value) => setFormData({ ...formData, templateType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select template type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="free">Free</SelectItem>
                                            <SelectItem value="testing">Testing</SelectItem>
                                            <SelectItem value="markup">Markup</SelectItem>
                                            <SelectItem value="official">Official</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="templateId">Template ID</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="templateId"
                                        value={formData.templateId}
                                        readOnly
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={generateTemplateId}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="packageName">Package Name</Label>
                                <Select
                                    value={formData.packageName as string}
                                    onValueChange={(value) => {
                                        setFormData({ ...formData, packageName: value || "", packageConstructor: "" });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packagesData?.packages.map((pkg) => (
                                            <SelectItem key={pkg.name} value={pkg.name}>
                                                {pkg.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="packageType">Package Type</Label>
                                    <Select
                                        value={formData.packageType as string}
                                        onValueChange={(value) => setFormData({ ...formData, packageType: value || "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a package type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {packageTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="packageConstructor">Package Constructor</Label>
                                    <Select
                                        value={formData.packageConstructor as string}
                                        onValueChange={(value) => setFormData({ ...formData, packageConstructor: value || "" })}
                                        disabled={!formData.packageName}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a constructor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {packageConstructors.map((constructor) => (
                                                <SelectItem key={constructor} value={constructor}>
                                                    {constructor}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {/* <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Input
                                id="type"
                                value={formData.type}
                                disabled={true}
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value })
                                }
                            />
                        </div> */}
                        </div>
                        <div className="col-span-2">
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label>Variables</Label>
                                    <Select
                                        value=""
                                        onValueChange={(value) => {
                                            const variable = availableVariables.find(v => v.key === value);
                                            if (variable) {
                                                setFormData({
                                                    ...formData,
                                                    variables: [
                                                        ...formData.variables,
                                                        {
                                                            key: variable.key,
                                                            value: "",
                                                            isOptional: false,
                                                            ui: variable.ui || {
                                                                type: "text",
                                                                label: variable.displayName,
                                                                placeholder: variable.description
                                                            }
                                                        }
                                                    ],
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Add Variable" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableVariables.map((variable) => (
                                                <SelectItem key={variable.key} value={variable.key}>
                                                    {variable.displayName || variable.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    {formData.variables.map((variable, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={variable.key}
                                                onChange={(e) => updateVariable(index, "key", e.target.value)}
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={variable.value}
                                                onChange={(e) => updateVariable(index, "value", e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={variable.isOptional}
                                                    onCheckedChange={(checked) =>
                                                        updateVariable(index, "isOptional", checked as boolean)
                                                    }
                                                />
                                                <Label>Optional</Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeVariable(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label>Bot Config</Label>
                                    <Select
                                        value=""
                                        onValueChange={(value) => {
                                            const config = availableBotConfigs.find(c => c.key === value);
                                            if (config) {
                                                setFormData({
                                                    ...formData,
                                                    botConfig: [
                                                        ...formData.botConfig,
                                                        {
                                                            key: config.key,
                                                            value: "",
                                                            isOptional: false,
                                                            ui: config.ui || {
                                                                type: "text",
                                                                label: config.displayName,
                                                                placeholder: config.description
                                                            }
                                                        }
                                                    ],
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Add Config" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBotConfigs.map((config) => (
                                                <SelectItem key={config.key} value={config.key}>
                                                    {config.displayName || config.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    {formData.botConfig.map((config, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={config.key}
                                                onChange={(e) => updateBotConfig(index, "key", e.target.value)}
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={config.value}
                                                onChange={(e) => updateBotConfig(index, "value", e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={config.isOptional}
                                                    onCheckedChange={(checked) =>
                                                        updateBotConfig(index, "isOptional", checked as boolean)
                                                    }
                                                />
                                                <Label>Optional</Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeBotConfig(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="min-w-[80vw] h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Secret Template</DialogTitle>
                        <DialogDescription>
                            Edit the secret template details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        <div className="col-span-1">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-templateId">Template ID</Label>
                                <Input
                                    id="edit-templateId"
                                    value={formData.templateId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, templateId: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-packageName">Package Name</Label>
                                <Select
                                    value={formData.packageName as string}
                                    onValueChange={(value) => {
                                        setFormData({ ...formData, packageName: value || "", packageConstructor: "" });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packagesData?.packages.map((pkg) => (
                                            <SelectItem key={pkg.name} value={pkg.name}>
                                                {pkg.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-packageType">Package Type</Label>
                                <Select
                                    value={formData.packageType as string}
                                    onValueChange={(value) => setFormData({ ...formData, packageType: value || "" })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a package type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packageTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-packageConstructor">Package Constructor</Label>
                                <Select
                                    value={formData.packageConstructor as string}
                                    onValueChange={(value) => setFormData({ ...formData, packageConstructor: value || "" })}
                                    disabled={!formData.packageName}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a constructor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packageConstructors.map((constructor) => (
                                            <SelectItem key={constructor} value={constructor}>
                                                {constructor}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label>Variables</Label>
                                    <Select
                                        value=""
                                        onValueChange={(value) => {
                                            const variable = availableVariables.find(v => v.key === value);
                                            if (variable) {
                                                setFormData({
                                                    ...formData,
                                                    variables: [
                                                        ...formData.variables,
                                                        {
                                                            key: variable.key,
                                                            value: "",
                                                            isOptional: false,
                                                            ui: variable.ui || {
                                                                type: "text",
                                                                label: variable.displayName,
                                                                placeholder: variable.description
                                                            }
                                                        }
                                                    ],
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Add Variable" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableVariables.map((variable) => (
                                                <SelectItem key={variable.key} value={variable.key}>
                                                    {variable.displayName || variable.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    {formData.variables.map((variable, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={variable.key}
                                                onChange={(e) => updateVariable(index, "key", e.target.value)}
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={variable.value}
                                                onChange={(e) => updateVariable(index, "value", e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={variable.isOptional}
                                                    onCheckedChange={(checked) =>
                                                        updateVariable(index, "isOptional", checked as boolean)
                                                    }
                                                />
                                                <Label>Optional</Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeVariable(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label>Bot Config</Label>
                                    <Select
                                        value=""
                                        onValueChange={(value) => {
                                            const config = availableBotConfigs.find(c => c.key === value);
                                            if (config) {
                                                setFormData({
                                                    ...formData,
                                                    botConfig: [
                                                        ...formData.botConfig,
                                                        {
                                                            key: config.key,
                                                            value: "",
                                                            isOptional: false,
                                                            ui: config.ui || {
                                                                type: "text",
                                                                label: config.displayName,
                                                                placeholder: config.description
                                                            }
                                                        }
                                                    ],
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Add Config" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBotConfigs.map((config) => (
                                                <SelectItem key={config.key} value={config.key}>
                                                    {config.displayName || config.key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    {formData.botConfig.map((config, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={config.key}
                                                onChange={(e) => updateBotConfig(index, "key", e.target.value)}
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={config.value}
                                                onChange={(e) => updateBotConfig(index, "value", e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={config.isOptional}
                                                    onCheckedChange={(checked) =>
                                                        updateBotConfig(index, "isOptional", checked as boolean)
                                                    }
                                                />
                                                <Label>Optional</Label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeBotConfig(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedTemplate?.name}? This action
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
