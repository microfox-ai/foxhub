"use client";

import { useSparkboard } from "../provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SessionSidebar() {
    const { indexingSessions, activeIndexingId, setActiveIndexingId } = useSparkboard();

    return (
        <div className="max-w-60 border-r flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="space-y-2">
                    {indexingSessions
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((session) => (
                            <Button
                                key={session.id}
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start",
                                    activeIndexingId === session.id && "bg-accent text-accent-foreground"
                                )}
                                onClick={() => setActiveIndexingId(session.id)}
                            >
                                {session.name}
                            </Button>
                        ))}
                </div>
            </ScrollArea>
        </div>
    );
} 