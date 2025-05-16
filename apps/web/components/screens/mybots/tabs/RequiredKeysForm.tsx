import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { BotFormValues } from "../types";
import { useState } from "react";
import { toast } from "sonner";
import { KeyVariableConfig } from "../../Chat/message/types";

interface RequiredKeysFormProps {
    form: UseFormReturn<BotFormValues>;
    requiredKeys: KeyVariableConfig[];
    hideKeys?: string[];
}

const RequiredKeysForm = ({ form, requiredKeys, hideKeys }: RequiredKeysFormProps) => {
    const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

    const toggleVisibility = (key: string) => {
        setVisibleFields((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const copyToClipboard = (value: string, fieldName: string) => {
        navigator.clipboard.writeText(value);
        toast.success(`${fieldName} copied to clipboard`);
    };

    if (!requiredKeys || requiredKeys.length === 0) return null;

    return (
        <div className="space-y-4">
            {requiredKeys
                .filter((keyInfo: KeyVariableConfig) => !hideKeys?.some((key: string) => keyInfo.key.includes(key)))
                .map((keyInfo: KeyVariableConfig) => (
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
    );
};

export default RequiredKeysForm; 