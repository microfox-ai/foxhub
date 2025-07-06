import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskIntegrationPlatform } from "@/server/convertfox/helpers/types";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Pencil } from "lucide-react";
import { Package } from "../../../types";
import useSWR from "swr";
import { PackageStatus } from "@/server/types";

interface EditTaskIntegrationsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    platforms: TaskIntegrationPlatform[];
    packages: Package[];
    onSave: (platforms: TaskIntegrationPlatform[]) => void;
}

export const EditTaskIntegrationsDialog = ({
    isOpen,
    onClose,
    platforms,
    packages,
    onSave,
}: EditTaskIntegrationsDialogProps) => {
    const [editedPlatforms, setEditedPlatforms] = useState<TaskIntegrationPlatform[]>(platforms);
    const [newPlatform, setNewPlatform] = useState<Partial<TaskIntegrationPlatform>>({
        name: "",
        reason: "",
        optional: false,
        package: "",
        scopes: [],
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const { data: searchPackages, mutate: mutateSearchPackages } = useSWR<Package[]>(
        `/api/packages/infos?packageTypes=${PackageStatus.STABLE},${PackageStatus.SEMISTABLE},${PackageStatus.EXTERNAL}&rawContent=true`,
        async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch packages");
            return res.json();
        },
        {
            revalidateOnFocus: false,
        }
    );

    const handleAddPlatform = () => {
        if (newPlatform.name && newPlatform.reason && newPlatform.package) {
            const selectedPackage = packages.find(p => p.name === newPlatform.package) ?? searchPackages?.find(p => p.name === newPlatform.package);
            const platformsToAdd: TaskIntegrationPlatform[] = [
                {
                    ...newPlatform,
                    scopes: newPlatform.scopes || [],
                } as TaskIntegrationPlatform
            ];

            // Add dependencies if they exist
            if (selectedPackage?.addedDependencies) {
                selectedPackage.addedDependencies.forEach(depName => {
                    const depPackage = packages.find(p => p.name === depName) ?? searchPackages?.find(p => p.name === depName);
                    if (depPackage) {
                        platformsToAdd.push({
                            name: depPackage.title || depName,
                            reason: depPackage.description || `Required dependency for ${selectedPackage.title || selectedPackage.name}`,
                            optional: true,
                            package: depName,
                            scopes: [],
                        });
                    }
                });
            }

            setEditedPlatforms([...editedPlatforms, ...platformsToAdd]);
            setNewPlatform({
                name: "",
                reason: "",
                optional: false,
                package: "",
                scopes: [],
            });
        }
    };

    const handleRemovePlatform = (index: number) => {
        setEditedPlatforms(editedPlatforms.filter((_, i) => i !== index));
        if (editingIndex === index) {
            setEditingIndex(null);
        }
    };

    const handleEditPlatform = (index: number) => {
        setEditingIndex(index);
    };

    const handleUpdatePlatform = (index: number, updatedPlatform: TaskIntegrationPlatform) => {
        const updated = [...editedPlatforms];
        updated[index] = updatedPlatform;
        setEditedPlatforms(updated);
        setEditingIndex(null);
    };

    const handleSave = () => {
        onSave(editedPlatforms);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] min-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Edit Task Integrations</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Existing Platforms */}
                    <div className="space-y-4">
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {editedPlatforms.map((platform, index) => (
                                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={packages.find(p => p.name === platform.package)?.icon}
                                                alt={platform.name}
                                                className="w-5 h-5"
                                            />
                                            <span className="font-medium">{platform.name}</span>
                                        </div>
                                        {editingIndex === index ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Reason</Label>
                                                    <Textarea
                                                        value={platform.reason}
                                                        onChange={(e) => {
                                                            const updated = [...editedPlatforms];
                                                            updated[index] = {
                                                                ...platform,
                                                                reason: e.target.value,
                                                            };
                                                            setEditedPlatforms(updated);
                                                        }}
                                                        placeholder="Why is this platform needed?"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={platform.optional}
                                                        onCheckedChange={(checked) => {
                                                            const updated = [...editedPlatforms];
                                                            updated[index] = {
                                                                ...platform,
                                                                optional: checked as boolean,
                                                            };
                                                            setEditedPlatforms(updated);
                                                        }}
                                                    />
                                                    <Label>Optional</Label>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setEditingIndex(null)}
                                                >
                                                    Done
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-sm text-gray-600">{platform.reason}</div>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={platform.optional}
                                                        onCheckedChange={(checked) => {
                                                            const updated = [...editedPlatforms];
                                                            updated[index] = {
                                                                ...platform,
                                                                optional: checked as boolean,
                                                            };
                                                            setEditedPlatforms(updated);
                                                        }}
                                                    />
                                                    <Label>Optional</Label>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditPlatform(index)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemovePlatform(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Add New Platform */}
                    <div className="space-y-4">
                        <div className="grid gap-4 p-4 border rounded-lg">
                            <div className="space-y-2">
                                <Label>Platform Name</Label>
                                <Input
                                    value={newPlatform.name}
                                    onChange={(e) =>
                                        setNewPlatform({ ...newPlatform, name: e.target.value })
                                    }
                                    placeholder="Enter platform name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Package</Label>
                                <Command className="rounded-lg border shadow-md">
                                    <CommandInput
                                        placeholder="Search packages..."
                                        value={newPlatform.package}
                                        onValueChange={(value) => {
                                            setNewPlatform({ ...newPlatform, package: value });
                                        }}
                                    />
                                    <CommandEmpty>No package found.</CommandEmpty>
                                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                                        {searchPackages
                                            ?.filter((pkg) =>
                                                pkg.name.toLowerCase().includes(newPlatform.package?.toLowerCase() || "")
                                            )
                                            .map((pkg) => (
                                                <CommandItem
                                                    key={pkg.name}
                                                    value={pkg.name}
                                                    onSelect={(value) => {
                                                        setNewPlatform({
                                                            ...newPlatform,
                                                            package: value,
                                                            name: pkg.title
                                                        });
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={pkg.icon}
                                                            alt={pkg.name}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{pkg.name}</span>
                                                    </div>
                                                    <Check
                                                        className={cn(
                                                            "ml-auto h-4 w-4",
                                                            newPlatform.package === pkg.name ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                    </CommandGroup>
                                </Command>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label>Reason</Label>
                                <Textarea
                                    value={newPlatform.reason}
                                    onChange={(e) =>
                                        setNewPlatform({ ...newPlatform, reason: e.target.value })
                                    }
                                    placeholder="Why is this platform needed?"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={newPlatform.optional}
                                    onCheckedChange={(checked) =>
                                        setNewPlatform({
                                            ...newPlatform,
                                            optional: checked as boolean,
                                        })
                                    }
                                />
                                <Label>Optional</Label>
                            </div>
                            <Button onClick={handleAddPlatform}>Add Platform</Button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 