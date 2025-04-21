import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, AlertTriangle, SettingsIcon, KeyIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { BotFormValues } from "../types";
import { RequiredKeyInfo } from "../types";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import ConfigurationTab from "./ConfigurationTab";
import { Package } from "../../Chat/message/types";

interface GeneralTabProps {
    form: UseFormReturn<BotFormValues>;
    requiredKeys: RequiredKeyInfo[];
    visibleFields: Record<string, boolean>;
    toggleVisibility: (key: string) => void;
    copyToClipboard: (value: string, fieldName: string) => void;
    mode: "create" | "edit";
    onDeleteBot?: () => Promise<void>;
    isDeleting?: boolean;
    packageInfo?: Package;
    packageName: string;
    botToEdit?: any;
    botConfig?: any;
}

const GeneralTab = ({
    form,
    requiredKeys,
    visibleFields,
    toggleVisibility,
    copyToClipboard,
    mode,
    onDeleteBot,
    isDeleting = false,
    packageName,
    botToEdit,
    botConfig,
    packageInfo,
}: GeneralTabProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        <div className="space-y-6 pt-10">
            <div className="flex flex-row items-center gap-2 border border-neutral-200 p-4 rounded-md">
                <img src={packageInfo?.icon} alt={packageInfo?.name} className="w-6 h-6 object-contain" />
                <div className="flex flex-col items-start ml-2">
                    <p className="text-md text-neutral-900 flex items-center gap-2">
                        {packageInfo?.title}
                        <span className="text-xs bg-neutral-200 px-1 py-1 rounded-md">{packageInfo?.name}</span>
                    </p>
                    <p className="text-sm text-neutral-500">
                        {packageInfo?.description}
                    </p>
                </div>
            </div>

            <FormField
                control={form.control}
                name="botName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {mode === "create" ? "Name your bot" : "Bot Nick Name"}
                        </FormLabel>
                        <FormControl>
                            <Input {...field} placeholder="Enter bot name" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {requiredKeys && requiredKeys.length > 0 && (
                <div className="border-t border-neutral-200 pt-10 mt-10">
                    <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        Required Keys
                    </h3>
                </div>
            )}

            {requiredKeys && requiredKeys.length > 0 && (
                <div className="space-y-4">
                    {requiredKeys.map((keyInfo: RequiredKeyInfo) => (
                        <FormField
                            key={keyInfo.key}
                            control={form.control}
                            name={`keys.${keyInfo.key}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                        {keyInfo.displayName || keyInfo.key}
                                        {keyInfo.isOptional && (
                                            <span className="ml-1 text-sm text-neutral-500">
                                                (Optional)
                                            </span>
                                        )}
                                    </FormLabel>
                                    {keyInfo.description && (
                                        <p className="text-xs text-neutral-500 -mt-2">
                                            {keyInfo.description}
                                        </p>
                                    )}
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type={!visibleFields[keyInfo.key] ? "password" : "text"}
                                                placeholder={`Enter ${keyInfo.displayName || keyInfo.key}`}
                                                className="bg-white pr-20"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => toggleVisibility(keyInfo.key)}
                                                >
                                                    {visibleFields[keyInfo.key] ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => copyToClipboard(field.value || '', keyInfo.displayName || keyInfo.key)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            )}

            <div className="border-t border-neutral-200 pt-10 mt-10">
                <h3 className="text-xs flex items-center gap-2 font-medium text-neutral-500 uppercase tracking-widest">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Bot Settings
                </h3>
            </div>
            <ConfigurationTab
                packageName={packageName}
                mode={mode}
                botToEdit={botToEdit}
                botConfig={botConfig}
            />
            {mode === "edit" && botToEdit?.id && (
                <div className="border border-red-200 rounded-md p-4 bg-red-50 mt-8">
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

export default GeneralTab; 