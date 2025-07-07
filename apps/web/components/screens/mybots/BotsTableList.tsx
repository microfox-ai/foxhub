"use client"

import { Skeleton } from "@mui/material";
import { useBots } from "./providers/BotProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Edit, Trash2, MoreHorizontal, ExternalLink, Settings, ChevronDown } from "lucide-react";
import { Identity } from "@microfox/oauth-kit";
import { usePathname, useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useMemo } from "react";
import { Bot } from "./providers/types";
import { clubUniqueBots } from "@/server/toolfox/helpers/fetchVariables";

// Import the clubUniqueSecrets function

export const BotsTableList = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleBotClick = (botId: string) => {
        router.push(`${pathname}/edit?botId=${botId}`);
    };

    const { bots, isLoading, error, stableBotPackages } = useBots();

    // Group bots using clubUniqueSecrets
    const groupedBots = useMemo(() => {
        if (!bots || bots.length === 0) return [];
        return clubUniqueBots(bots);
    }, [bots]);

    const toggleExpanded = (botId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(botId)) {
            newExpanded.delete(botId);
        } else {
            newExpanded.add(botId);
        }
        setExpandedRows(newExpanded);
    };

    console.log("groupedBots", groupedBots);

    if (isLoading) {
        return (
            <div className="rounded-lg bg-card w-full overflow-y-auto h-screen pb-[200px]">
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent px-8">
                            <TableHead className="w-[350px] font-medium">Bot</TableHead>
                            <TableHead className="font-medium">Connection</TableHead>
                            <TableHead className="font-medium">Type</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium">Last Updated</TableHead>
                            <TableHead className="text-right font-medium">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <TableRow key={i} className="px-8">
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="flex flex-col space-y-2">
                                            <Skeleton className="h-4 w-[180px]" />
                                            <Skeleton className="h-3 w-[120px]" />
                                            <Skeleton className="h-5 w-16" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Skeleton className="h-6 w-6 rounded-full" />
                                            <Skeleton className="h-4 w-[120px]" />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Skeleton className="h-6 w-6 rounded-full" />
                                            <Skeleton className="h-4 w-[140px]" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <Skeleton className="w-2 h-2 rounded-full" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col space-y-1">
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-3 w-[60px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-8 w-8 rounded ml-auto" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">Error loading bots: {error.message}</p>
            </div>
        );
    }

    if (!groupedBots || groupedBots.length === 0) {
        return (
            <div className="text-center py-12 h-screen flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold mb-2">No bots found</h3>
                <p className="text-muted-foreground mb-4">Create your first bot to get started with automation.</p>
                <Button onClick={() => router.push(`${pathname}/new-bot`)}>
                    Create Bot
                </Button>
            </div>
        );
    }

    const renderBotRow = (bot: Bot, isAlternative: boolean = false) => {
        const identity = bot.identityMetadata as any as Identity;
        const botName = identity?.teamInfo?.name ?? identity?.userInfo?.name;
        const packageName = bot.packageInfo?.title || bot.packageName;
        const isActive = bot.status === "FILLED" && bot.clientRequestIds?.length > 0;

        return (
            <TableRow
                key={bot.id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors px-8 ${isAlternative ? 'bg-muted/20 ml-10' : ''}`}
                onClick={() => handleBotClick(bot.id)}
            >
                <TableCell>
                    <div className={`flex items-center space-x-3 ${isAlternative ? 'ml-15' : ''}`}>
                        {!isAlternative && (
                            <div className="relative">
                                <Avatar className="h-12 w-12 ring-2 ring-background">
                                    <AvatarImage
                                        src={bot?.image ?? bot?.botConfigMapped?.botImage ?? "/images/default-bot-avatar.png"}
                                        alt={botName}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                        {botName?.charAt(0)?.toUpperCase() || "B"}
                                    </AvatarFallback>
                                </Avatar>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border shadow-sm ring-2 ring-background">
                                            <img
                                                src={bot.packageInfo?.icon ?? "/default-bot-platform.png"}
                                                alt={bot.packageInfo?.name}
                                                className="w-4 h-4 object-contain"
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-medium">{bot.packageInfo?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Connected by {identity?.userInfo?.name}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">
                                {bot?.packageInfo?.title}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                                {bot.packageInfo?.name}
                            </span>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-row items-center space-x-3">
                        {identity?.teamInfo && (
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <img
                                        src={identity.teamInfo.icon ?? "/default-bot-platform.png"}
                                        alt={identity.teamInfo.name}
                                        className="w-10 h-10 object-contain rounded-lg bg-white border"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                        Connected to {identity.teamInfo.name}
                                    </span>
                                    <Badge variant="outline" className="w-fit text-xs text-muted-foreground mt-1">
                                        by {identity.userInfo?.name}
                                    </Badge>
                                </div>
                            </div>
                        )}
                        {!identity?.teamInfo && identity?.userInfo && (
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <img
                                        src={identity?.userInfo?.avatarUrl ?? "/images/default-bot-avatar.png"}
                                        alt={identity?.userInfo?.name}
                                        className="w-10 h-10 object-contain rounded-lg bg-white border"
                                    />
                                </div>
                                <span className="text-sm">
                                    Connected by {identity?.userInfo?.name || "Unknown"}
                                </span>
                            </div>
                        )}
                        {!identity?.teamInfo && !identity?.userInfo && (
                            <div className="flex items-center space-x-3">
                                <span className="text-sm text-muted-foreground">
                                    Connected by/to Unknown
                                </span>
                            </div>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    <Badge
                        variant={bot.packageType === "apikey" ? "default" : "outline"}
                        className="text-xs"
                    >
                        {bot.packageType === "apikey" ? "API Key" :
                            bot.packageType === "oauth2" ? "OAuth 2.0" :
                                bot.packageType?.toUpperCase() || "Custom"}
                    </Badge>
                </TableCell>
                <TableCell>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <Badge
                            variant={isActive ? "success" : "secondary"}
                            className="text-xs"
                        >
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            {new Date(bot.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(bot.updatedAt).toLocaleTimeString()}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleBotClick(bot.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Bot
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Bot
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="rounded-lg bg-card w-full overflow-y-auto h-screen pb-[200px]">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold">Recent Connections</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage and configure your connections to external services
                </p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent px-8">
                        <TableHead className="w-[350px] font-medium">Bot</TableHead>
                        <TableHead className="font-medium">Connection</TableHead>
                        <TableHead className="font-medium">Type</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Last Updated</TableHead>
                        <TableHead className="text-right font-medium">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupedBots.map((group) => {
                        const groupedBot = group.main;
                        const identity = groupedBot.identityMetadata as any as Identity;
                        const botName = identity?.teamInfo?.name ?? identity?.userInfo?.name;
                        const packageName = groupedBot.packageInfo?.title || groupedBot.packageName;
                        const isActive = groupedBot.status === "FILLED" && groupedBot.clientRequestIds?.length > 0;
                        const hasAlternatives = group.alternatives && group.alternatives.length > 0;
                        const isExpanded = expandedRows.has(groupedBot.id);

                        return (
                            <>
                                <TableRow
                                    key={groupedBot.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors px-8"
                                    onClick={() => handleBotClick(groupedBot.id)}
                                >
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <Avatar className="h-12 w-12 ring-2 ring-background">
                                                    <AvatarImage
                                                        src={groupedBot?.image ?? groupedBot?.botConfigMapped?.botImage ?? "/images/default-bot-avatar.png"}
                                                        alt={botName}
                                                    />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {botName?.charAt(0)?.toUpperCase() || "B"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border shadow-sm ring-2 ring-background">
                                                            <img
                                                                src={groupedBot.packageInfo?.icon ?? "/default-bot-platform.png"}
                                                                alt={groupedBot.packageInfo?.name}
                                                                className="w-4 h-4 object-contain"
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-medium">{groupedBot.packageInfo?.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Connected by {identity?.userInfo?.name}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="font-medium text-sm truncate">
                                                    {groupedBot?.packageInfo?.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {groupedBot.packageInfo?.name}
                                                </span>
                                                {hasAlternatives && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-muted-foreground hover:bg-gray-200 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleExpanded(groupedBot.id);
                                                        }}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3" />
                                                        )}
                                                        <span className="text-xs">+{group.alternatives.length} Instances</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-row items-center space-x-3">
                                            {identity?.teamInfo && (
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <img
                                                            src={identity.teamInfo.icon ?? "/default-bot-platform.png"}
                                                            alt={identity.teamInfo.name}
                                                            className="w-10 h-10 object-contain rounded-lg bg-white border"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            Connected to {identity.teamInfo.name}
                                                        </span>
                                                        <Badge variant="outline" className="w-fit text-xs text-muted-foreground mt-1">
                                                            by {identity.userInfo?.name}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                            {!identity?.teamInfo && identity?.userInfo && (
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <img
                                                            src={identity?.userInfo?.avatarUrl ?? "/images/default-bot-avatar.png"}
                                                            alt={identity?.userInfo?.name}
                                                            className="w-10 h-10 object-contain rounded-lg bg-white border"
                                                        />
                                                    </div>
                                                    <span className="text-sm">
                                                        Connected by {identity?.userInfo?.name || "Unknown"}
                                                    </span>
                                                </div>
                                            )}
                                            {!identity?.teamInfo && !identity?.userInfo && (
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        Connected by/to Unknown
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={groupedBot.packageType === "apikey" ? "default" : "outline"}
                                            className="text-xs"
                                        >
                                            {groupedBot.packageType === "apikey" ? "API Key" :
                                                groupedBot.packageType === "oauth2" ? "OAuth 2.0" :
                                                    groupedBot.packageType?.toUpperCase() || "Custom"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <Badge
                                                variant={isActive ? "success" : "secondary"}
                                                className="text-xs"
                                            >
                                                {isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(groupedBot.updatedAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(groupedBot.updatedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 hover:bg-muted"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={() => handleBotClick(groupedBot.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit Bot
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Bot
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                {/* Render alternatives if expanded */}
                                {isExpanded && hasAlternatives && group.alternatives.map((alternative) =>
                                    renderBotRow(alternative, true)
                                )}
                            </>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};