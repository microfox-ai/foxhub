"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ChevronUp, PlusIcon } from "lucide-react";
import useSWR from "swr";
import debounce from "lodash/debounce";
import { AgentInfo } from "@microfox/types";

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
import {
    HoverCard,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ApiMcp } from "@/utils/services/embeddings/types";
import { useMicrofoxChat } from "../MicrofoxChatProvider";
import { IN_DEV, IN_STAGING } from "@/utils/constants/appInfo";
import { McpHoverCardContent } from "./McpHoverCard";

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

    const stableMcps = mcps?.filter((mcp) => (mcp?.metadata?.docs_data?.info as AgentInfo)?.status === "stable") ?? [];
    const semiStabelMcps = mcps?.filter((mcp) => (mcp?.metadata?.docs_data?.info as AgentInfo)?.status === "semi-stable") ?? [];

    const finalMcps = IN_DEV ? stableMcps : IN_STAGING ? [...stableMcps, ...semiStabelMcps] : stableMcps;

    return (
        <div className="flex flex-row items-center gap-2">
            {selectedMcps.length > 0
                ? (
                    <div className="flex items-center gap-2">
                        {selectedMcps.slice(0, 3).map((mcp) => {
                            const agentInfo = mcp.metadata.docs_data?.info as AgentInfo;
                            return (
                                <HoverCard key={mcp.id} openDelay={0}>
                                    <HoverCardTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-pointer">
                                            {agentInfo?.iconUrl && (
                                                <img src={agentInfo.iconUrl} alt={agentInfo?.title} className="w-4 h-4 rounded-full" />
                                            )}
                                            <span>{agentInfo?.title}</span>
                                        </div>
                                    </HoverCardTrigger>
                                    <McpHoverCardContent
                                        agentInfo={agentInfo}
                                        side="top"
                                        align="center"
                                        paths={mcp.metadata.docs_data?.paths}
                                    />
                                </HoverCard>
                            );
                        })}
                        {selectedMcps.length > 3 && (
                            <span className="text-muted-foreground">
                                + {selectedMcps.length - 3} more
                            </span>
                        )}
                    </div>
                )
                : (
                    <div className="flex items-center gap-2">
                    </div>
                )
            }
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="justify-between"
                    >
                        {selectedMcps?.length > 0 ? null : "Auto-Select"}
                        {selectedMcps?.length > 0 ? <PlusIcon className="h-4 w-4 shrink-0 opacity-50" /> : <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
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
                                {finalMcps?.map((mcp) => {
                                    const agentInfo = mcp.metadata.docs_data?.info as AgentInfo;
                                    return (
                                        // <HoverCard key={mcp.id}>
                                        //     <HoverCardTrigger asChild>
                                        <CommandItem
                                            value={mcp.name}
                                            onSelect={() => handleSelect(mcp)}
                                            className="relative"
                                        >
                                            <div className="flex items-center gap-2">
                                                {agentInfo?.iconUrl && (
                                                    <img src={agentInfo.iconUrl} alt={agentInfo?.title} className="w-4 h-4 rounded-full" />
                                                )}
                                                <span>{agentInfo?.title ?? mcp.package_name}</span>
                                            </div>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-4 w-4",
                                                    selectedMcps.some((selected) => selected.id === mcp.id)
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                        //     </HoverCardTrigger>
                                        //     <McpHoverCardContent agentInfo={agentInfo} paths={mcp.metadata.docs_data?.paths} />
                                        // </HoverCard>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

        </div>
    );
};