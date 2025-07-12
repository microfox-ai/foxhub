"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import debounce from "lodash/debounce";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";
import { useMicrofoxChat } from "../MicrofoxChatProvider";

const fetcher = async (url: string) => {
    const res = await fetch(url);

    if (!res.ok) {
        const error = new Error("An error occurred while fetching the data.");
        throw error;
    }

    const data = await res.json();
    return data.mixed as ApiMcp[];
};

export const McpSelect = () => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
    const { selectedMcps, setSelectedMcps } = useMicrofoxChat();

    const {
        data: mcps,
        error,
        isLoading,
    } = useSWR<ApiMcp[]>(
        `/api/mcp?query=${debouncedSearchQuery}&query_type=plain_search`,
        fetcher
    );

    const debouncedSetQuery = React.useCallback(
        debounce((query: string) => setDebouncedSearchQuery(query), 300),
        []
    );

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        debouncedSetQuery(query);
    };

    const handleSelect = (mcp: ApiMcp) => {
        setSelectedMcps((prev) => {
            const isSelected = prev.some((item) => item.id === mcp.id);
            if (isSelected) {
                return prev.filter((item) => item.id !== mcp.id);
            } else {
                return [...prev, mcp];
            }
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className=" justify-between"
                >
                    {selectedMcps.length > 0
                        ? `${selectedMcps.length} selected`
                        : "Auto-Select"}
                    <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search MCP..."
                        value={searchQuery}
                        onValueChange={handleSearchChange}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? "Searching..." : "No MCP found."}
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {mcps?.map((mcp) => (
                                <CommandItem
                                    key={mcp.id}
                                    value={mcp.name}
                                    onSelect={() => handleSelect(mcp)}
                                >
                                    {mcp.package_name}
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedMcps.some((selected) => selected.id === mcp.id)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};