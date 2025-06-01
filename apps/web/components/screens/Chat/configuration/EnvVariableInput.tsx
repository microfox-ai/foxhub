import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface EnvVariableInputProps {
    type: "input" | "select" | "multi-select" | "text-array" | "textarea" | "checkbox";
    value: string;
    onChange: (value: string) => void;
    options?: string[];
    placeholder?: string;
    className?: string;
    defaultValue?: string;
}

export function EnvVariableInput({
    type,
    value,
    onChange,
    options = [],
    placeholder,
    className,
    defaultValue,
}: EnvVariableInputProps) {
    // Initialize with defaultValue if value is empty
    React.useEffect(() => {
        if (!value && defaultValue) {
            onChange(defaultValue);
        }
    }, []); // Only run on mount

    const [isInputFocused, setIsInputFocused] = useState(false);
    const [currentInput, setCurrentInput] = React.useState("");
    const [customOptions, setCustomOptions] = React.useState<string[]>([]);

    // Handle checkbox value conversion
    const handleCheckboxChange = (checked: boolean) => {
        onChange(checked ? "TRUE" : "FALSE");
    };

    const items = value ? value.split(",").map((item) => item.trim()) : [];

    // Handle text array value conversion
    const handleTextArrayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setCurrentInput(text);

        // Split by both commas and newlines
        const newItems = text
            .split(/[,\n]/)
            .map(item => item.trim())
            .filter(Boolean);

        if (newItems.length > 0) {
            // Add new items to existing ones, avoiding duplicates
            const updatedItems = [...new Set([...items, ...newItems])];
            onChange(updatedItems.join(","));
            setCurrentInput("");
        }
    };

    const selectedValues = value ? value.split(",").map((item) => item.trim()) : [];
    // Handle multi-select value conversion
    const handleMultiSelectChange = (_selectedValues: string[]) => {
        onChange(_selectedValues.join(","));
    };

    const handleAddCustomOption = (newValue: string) => {
        if (newValue && !options.includes(newValue) && !customOptions.includes(newValue)) {
            setCustomOptions([...customOptions, newValue]);
            handleMultiSelectChange([...selectedValues, newValue]);
        }
    };

    switch (type) {
        case "input":
            return (
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={className}
                />
            );

        case "select":
            return (
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className={className}>
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );

        case "multi-select":
            const allOptions = [...options, ...customOptions];
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        {allOptions.map((option, index) => (
                            <div
                                key={option}
                                onClick={() => {
                                    const trimmedOption = option.trim();
                                    if (selectedValues.includes(trimmedOption)) {
                                        handleMultiSelectChange(
                                            selectedValues.filter((v) => v !== trimmedOption)
                                        );
                                    } else {
                                        handleMultiSelectChange([...selectedValues, trimmedOption]);
                                    }
                                }}
                                className={cn(
                                    "relative flex items-center p-2 rounded-lg border cursor-pointer transition-all duration-200",
                                    selectedValues.includes(option.trim())
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-md text-sm font-medium",
                                        selectedValues.includes(option.trim())
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <span className="text-sm font-medium">{option}</span>
                                    {selectedValues.includes(option.trim()) && (
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground ml-auto">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <div
                            className={cn(
                                "relative flex items-center py-2 px-2 rounded-lg border cursor-text transition-all duration-200",
                                "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                                    {allOptions.length + 1}
                                </div>
                                <Input
                                    placeholder="Type & Press Enter to add custom option..."
                                    className="w-full leading-[0.25em] m-0 border-0 bg-transparent shadow-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.currentTarget.value) {
                                            e.preventDefault();
                                            const newValue = e.currentTarget.value.trim();
                                            handleAddCustomOption(newValue);
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "text-array":
            return (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {items.map((item, index) => (
                            <Badge
                                key={`${item}-${index}`}
                                variant="secondary"
                                className="flex items-center gap-1"
                            >
                                {item}
                                <button
                                    onClick={() => {
                                        const newItems = items.filter((_, i) => i !== index);
                                        onChange(newItems.join(","));
                                    }}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Remove item</span>
                                </button>
                            </Badge>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Command className="rounded-lg border shadow-md">
                            <CommandInput
                                placeholder={placeholder || "Type and press Enter to add items..."}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value) {
                                        e.preventDefault();
                                        const newValue = e.currentTarget.value.trim();
                                        if (newValue && !items.includes(newValue)) {
                                            onChange([...items, newValue].join(","));
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                            />
                        </Command>
                    </div>
                </div>
            );

        case "textarea":
            return (
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn("min-h-[100px]", className)}
                />
            );

        case "checkbox":
            return (
                <div className={cn("flex items-center gap-2", className)}>
                    <Checkbox
                        checked={value === "TRUE"}
                        onCheckedChange={handleCheckboxChange}
                        className={cn("h-4 w-4")}
                    />
                    {value === "TRUE" ? "Yes" : "No"}
                </div>
            );

        default:
            return null;
    }
} 