"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useSecret } from "./providers/SecretProvider";


export function BotHeader({
    type
}: {
    type: "bots" | "data"
}) {

    const { botToEdit, botId } = useSecret();
    const botName = botId ? botToEdit?.name : null;
    return (
        <div className="px-6 pt-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/">Home</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href={type === "bots" ? "/my-bots" : "/my-data"}>My {type}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {botName && botId && (
                        <>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{botName}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </>
                    )}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}
