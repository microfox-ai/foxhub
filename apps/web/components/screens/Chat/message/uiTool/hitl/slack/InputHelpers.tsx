import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { XIcon, Search, Check, ChevronDown } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 50;

export const StringInput = ({ value, onChange, label, placeholder, className }: { value: string, onChange: (value: string) => void, label?: string, placeholder?: string, className?: string }) => (
    <div className="flex flex-col gap-2">
        {label && <Label>{label}</Label>}
        <Input className={className} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
);

export const BooleanInput = ({ value, onChange, label }: { value: boolean, onChange: (value: boolean) => void, label: string }) => (
    <div className="flex items-center gap-2">
        <Checkbox id={label} checked={value} onCheckedChange={onChange} />
        <Label htmlFor={label}>{label}</Label>
    </div>
);

export interface SelectInputProps<T extends { [key: string]: any }> {
    value: string;
    onChange: (value: string) => void;
    label: string;
    options: T[];
    placeholder?: string;
    searchKeys?: (keyof T)[];
    renderOption?: (item: T, isSelected: boolean) => React.ReactNode;
    renderTrigger?: (selectedItem: T | undefined, placeholder: string) => React.ReactNode;
    getOptionValue: (item: T) => string;
}

export const SelectInput = <T extends { [key: string]: any }>({
    value,
    onChange,
    label,
    options,
    placeholder = "Select...",
    searchKeys = ['label', 'value'],
    renderOption,
    renderTrigger,
    getOptionValue
}: SelectInputProps<T>) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            searchKeys.some(key =>
                String(option[key])?.toLowerCase()?.includes(searchTerm?.toLowerCase())
            )
        );
    }, [options, searchTerm, searchKeys]);

    const paginatedOptions = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return filteredOptions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOptions, currentPage]);

    const totalPages = Math.ceil(filteredOptions.length / ITEMS_PER_PAGE);
    const selectedOption = options.find(opt => getOptionValue(opt) === value);

    // Default render functions
    const defaultRenderOption = (item: T, isSelected: boolean) => (
        <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
                <span>{String(item.label)}</span>
                <span className="text-xs text-gray-500">{getOptionValue(item)}</span>
            </div>
            {isSelected && <Check className="w-4 h-4 text-green-500" />}
        </div>
    );

    const defaultRenderTrigger = (selectedItem: T | undefined, placeholderText: string) => (
        <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
        >
            {selectedItem ? (
                <div className="flex flex-col items-start">
                    <span>{String(selectedItem.label)}</span>
                    <span className="text-xs text-gray-500">{getOptionValue(selectedItem)}</span>
                </div>
            ) : (
                <span className="text-muted-foreground">{placeholderText}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
    );

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {(renderTrigger || defaultRenderTrigger)(selectedOption, placeholder)}
                </PopoverTrigger>
                <PopoverContent className="p-0 w-full! min-w-[400px]" align="center" side="bottom" sideOffset={-36}>
                    <div className="p-2 border-b w-full!">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground focus:outline-none focus:ring-0" />
                            <Input
                                ref={inputRef}
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                }}
                                className="pl-8 shadow-none focus:outline-none focus:ring-0 text-sm ring-0 outline-none focus:border-none focus-visible:ring-0"
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {paginatedOptions.length > 0 ? (
                            <>
                                {paginatedOptions.map((option) => (
                                    <div
                                        key={getOptionValue(option)}
                                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${getOptionValue(option) === value ? 'bg-gray-50' : ''}`}
                                        onClick={() => {
                                            onChange(getOptionValue(option));
                                            setIsOpen(false);
                                        }}
                                    >
                                        {(renderOption || defaultRenderOption)(option, getOptionValue(option) === value)}
                                    </div>
                                ))}

                                {totalPages > 1 && (
                                    <div className="p-2 border-t flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentPage(Math.max(0, currentPage - 1));
                                            }}
                                            disabled={currentPage === 0}
                                            className="text-xs px-2 py-1 bg-black/50 rounded disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-gray-600">
                                            Page {currentPage + 1} of {totalPages}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
                                            }}
                                            disabled={currentPage === totalPages - 1}
                                            className="text-xs px-2 py-1 bg-black/50 rounded disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No matches found
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export interface MultiSelectInputProps<T extends { [key: string]: any }> {
    values: T[];
    onChange: (values: T[]) => void;
    label: string;
    options: T[];
    placeholder?: string;
    searchKeys?: (keyof T)[];
    renderBadge?: (item: T, onRemove: () => void) => React.ReactNode;
    renderOption?: (item: T, isSelected: boolean) => React.ReactNode;
    getOptionValue: (item: T) => string;
}

export const MultiSelectInput = <T extends { [key: string]: any }>({
    values,
    onChange,
    label,
    options,
    placeholder = "Search...",
    searchKeys = ['label', 'value'],
    renderBadge,
    renderOption,
    getOptionValue
}: MultiSelectInputProps<T>) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOptions = values;

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            searchKeys.some(key =>
                String(option[key])?.toLowerCase()?.includes(searchTerm?.toLowerCase())
            )
        );
    }, [options, searchTerm, searchKeys]);

    const paginatedOptions = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return filteredOptions?.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOptions, currentPage]);

    const totalPages = Math.ceil(filteredOptions?.length / ITEMS_PER_PAGE);

    const handleRemove = (itemToRemove: T) => {
        onChange(values.filter(v => getOptionValue(v) !== getOptionValue(itemToRemove)));
    };

    const handleSelect = (option: T) => {
        const isSelected = values.some(v => getOptionValue(v) === getOptionValue(option));
        if (isSelected) {
            onChange(values.filter(v => getOptionValue(v) !== getOptionValue(option)));
        } else {
            onChange([...values, option]);
        }
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Default render functions if not provided
    const defaultRenderBadge = (item: T, onRemove: () => void) => (
        <Badge key={getOptionValue(item)} variant="secondary" className="gap-1 h-6">
            {String(item.label)}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="hover:bg-gray-300 rounded-full p-0.5"
            >
                <XIcon className="w-3 h-3" />
            </button>
        </Badge>
    );

    const defaultRenderOption = (item: T, isSelected: boolean) => (
        <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
                <span>{String(item.label)}</span>
                <span className="text-xs text-gray-500">{getOptionValue(item)}</span>
            </div>
            {isSelected && <Check className="w-4 h-4 text-green-500" />}
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            <div
                ref={containerRef}
                className="relative"
            >
                <div className="border rounded-md overflow-hidden">
                    {/* Search Input at Top */}
                    <div className="relative border-b">
                        <div className="flex items-center px-3">
                            <Search className="w-4 h-4" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none py-2 pl-2 pr-3 placeholder:text-sm"
                                placeholder={label}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                    setIsFocused(true);
                                }}
                                onFocus={() => setIsFocused(true)}
                            />
                            <div className="text-sm text-white bg-black/50 rounded-md p-1">
                                {selectedOptions.length}
                            </div>
                        </div>
                    </div>

                    {/* Selected Items Below */}
                    {selectedOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 min-h-[100px] max-h-[200px] overflow-y-auto">
                            {selectedOptions.map((option) => (
                                <div key={getOptionValue(option)} className="flex items-center">
                                    {(renderBadge || defaultRenderBadge)(option, () => handleRemove(option))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {isFocused && (
                    <div className="absolute left-0 right-0 top-10 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-[150px] overflow-y-auto">
                        {paginatedOptions.length > 0 ? (
                            <>
                                {paginatedOptions.map((option) => {
                                    const isSelected = selectedOptions.some(
                                        v => getOptionValue(v) === getOptionValue(option)
                                    );
                                    return (
                                        <div
                                            key={getOptionValue(option)}
                                            className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-gray-50' : ''}`}
                                            onClick={() => handleSelect(option)}
                                        >
                                            {(renderOption || defaultRenderOption)(option, isSelected)}
                                        </div>
                                    );
                                })}

                                {totalPages > 1 && (
                                    <div className="p-2 border-t flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentPage(Math.max(0, currentPage - 1));
                                            }}
                                            disabled={currentPage === 0}
                                            className="text-xs px-2 py-1 bg-black/50 rounded disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-gray-600">
                                            Page {currentPage + 1} of {totalPages}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
                                            }}
                                            disabled={currentPage === totalPages - 1}
                                            className="text-xs px-2 py-1 bg-black/50 rounded disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No matches found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
