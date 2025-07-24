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
import { XIcon, Search } from "lucide-react";
import { useState, useMemo } from "react";

const ITEMS_PER_PAGE = 50;

export const StringInput = ({ value, onChange, label, placeholder }: { value: string, onChange: (value: string) => void, label: string, placeholder?: string }) => (
    <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
);

export const BooleanInput = ({ value, onChange, label }: { value: boolean, onChange: (value: boolean) => void, label: string }) => (
    <div className="flex items-center gap-2">
        <Checkbox id={label} checked={value} onCheckedChange={onChange} />
        <Label htmlFor={label}>{label}</Label>
    </div>
);

export const SelectInput = ({ value, onChange, label, options, placeholder }: { value: string, onChange: (value: string) => void, label: string, options: { value: string, label: string }[], placeholder?: string }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    
    const filteredOptions = useMemo(() => {
        return options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            option.value.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);
    
    const paginatedOptions = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return filteredOptions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOptions, currentPage]);
    
    const totalPages = Math.ceil(filteredOptions.length / ITEMS_PER_PAGE);
    const selectedOption = options.find(opt => opt.value === value);
    const validValue = selectedOption ? value : undefined;

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <Select onValueChange={onChange} value={validValue}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[300px]">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                }}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    
                    {paginatedOptions?.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-xs text-gray-500">{option.value}</span>
                            </div>
                        </SelectItem>
                    ))}
                    
                    {totalPages > 1 && (
                        <div className="p-2 border-t flex justify-between items-center">
                            <button
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage === 0}
                                className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-600">
                                Page {currentPage + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                    
                    {filteredOptions.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No items found
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};

export const MultiSelectInput = ({ values, onChange, label, options, placeholder }: { values: string[], onChange: (values: string[]) => void, label: string, options: { value: string, label: string }[], placeholder?: string }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedOptions = values?.map(v => options?.find(o => o?.value === v)).filter(Boolean);
    const availableOptions = options?.filter(option => !values?.includes(option?.value));
    
    const filteredOptions = useMemo(() => {
        return availableOptions.filter(option => 
            option?.label?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
            option?.value?.toLowerCase()?.includes(searchTerm?.toLowerCase())
        );
    }, [availableOptions, searchTerm]);
    
    const paginatedOptions = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return filteredOptions?.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOptions, currentPage]);
    
    const totalPages = Math.ceil(filteredOptions?.length / ITEMS_PER_PAGE);

    const handleRemove = (valueToRemove: string) => {
        onChange(values?.filter(v => v !== valueToRemove));
    };

    const handleAdd = (valueToAdd: string) => {
        onChange([...values, valueToAdd] as string[]);
        setSearchTerm('');
        setCurrentPage(0);
    };

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            
            {/* Selected items display */}
            {selectedOptions?.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-gray-50">
                    {selectedOptions?.map((option) => (
                        <Badge key={option!.value} variant="secondary" className="gap-1">
                            {option!.label}
                            <button
                                onClick={() => handleRemove(option!.value)}
                                className="hover:bg-gray-300 rounded-full p-0.5"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            
            {/* Selection dropdown */}
            <Select onValueChange={handleAdd} open={isOpen} onOpenChange={setIsOpen}>
                <SelectTrigger>
                    <SelectValue placeholder={selectedOptions?.length > 0 ? "Add more..." : placeholder} />
                </SelectTrigger>
                <SelectContent className="w-[300px]">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search to add..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(0);
                                }}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    
                    {paginatedOptions?.map(option => (
                        <SelectItem key={option?.value} value={option?.value}>
                            <div className="flex flex-col">
                                <span>{option?.label}</span>
                                <span className="text-xs text-gray-500">{option?.value}</span>
                            </div>
                        </SelectItem>
                    ))}
                    
                    {totalPages > 1 && (
                        <div className="p-2 border-t flex justify-between items-center">
                            <button
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage === 0}
                                className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-600">
                                Page {currentPage + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                disabled={currentPage === totalPages - 1}
                                className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                    
                    {filteredOptions?.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            {availableOptions?.length === 0 ? "All items selected" : "No items found"}
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
