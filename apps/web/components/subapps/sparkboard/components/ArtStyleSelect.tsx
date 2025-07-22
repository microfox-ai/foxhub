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

export const ArtStyleSelect = () => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const { artStyle, setArtStyle, availableArtStyles, mutateSearchResults } = useSparkboard();

    const filteredStyles = React.useMemo(() => {
        const query = searchQuery.toLowerCase();
        return Array.from(availableArtStyles).filter(style =>
            style.toLowerCase().includes(query)
        ).sort();
    }, [availableArtStyles, searchQuery]);

    const handleSelect = (style: string) => {
        // If the style is already selected, unselect it
        if (artStyle === style) {
            setArtStyle("");
        } else {
            setArtStyle(style);
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
                    {artStyle || "Select art style"}
                    <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search art styles..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>No art styles found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {filteredStyles.map((style) => (
                                <CommandItem
                                    key={style}
                                    value={style}
                                    onSelect={() => handleSelect(style)}
                                >
                                    {style}
                                    <Check
                                        className={`ml-auto h-4 w-4 ${artStyle === style ? "opacity-100" : "opacity-0"
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