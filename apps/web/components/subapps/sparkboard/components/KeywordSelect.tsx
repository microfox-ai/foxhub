"use client";

import * as React from "react";
import { Check, ChevronUp } from "lucide-react";
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
import { useSparkboard } from "../provider";

export const KeywordSelect = () => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const { searchKeywords, setSearchKeywords, availableKeywords, mutateSearchResults } = useSparkboard();

    const filteredKeywords = React.useMemo(() => {
        const query = searchQuery.toLowerCase();
        return Array.from(availableKeywords).filter(keyword =>
            keyword.toLowerCase().includes(query)
        ).sort();
    }, [availableKeywords, searchQuery]);

    const handleSelect = (keyword: string) => {
        // If the keyword is already selected, unselect it
        if (searchKeywords === keyword) {
            setSearchKeywords("");
        } else {
            setSearchKeywords(keyword);
        }
        setOpen(false);
        setTimeout(() => {
            mutateSearchResults();
        }, 500);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="justify-between"
                >
                    {searchKeywords || "Select keyword"}
                    <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search keywords..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>No keywords found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {filteredKeywords.map((keyword) => (
                                <CommandItem
                                    key={keyword}
                                    value={keyword}
                                    onSelect={() => handleSelect(keyword)}
                                >
                                    {keyword}
                                    <Check
                                        className={`ml-auto h-4 w-4 ${searchKeywords === keyword ? "opacity-100" : "opacity-0"
                                            }`}
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