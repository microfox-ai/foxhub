import { PlusIcon } from "lucide-react";
import { ShardPagesTabProps } from "./types";
import { MinionType } from "../hooks/convertors";
import { MinionFlow } from "../hooks/convertors";
import useSWR from "swr";
import { ShardPage } from "@prisma/client";
import { useClientProject } from "../providers/ClientProjectProvider";

export const ShardPagesTab = (props: ShardPagesTabProps) => {

    const { selectedProject, createNewEmptyRequest } = useClientProject();


    const { data: shardpages, isLoading: shardpagesLoading } = useSWR<ShardPage[]>("/api/shard-page?status=PUBLISHED",
        (url: string) => fetch(url).then(res => res.ok ? res.json() : [])
    );

    console.log("shardpages", shardpages);

    return (
        <div className="bg-white rounded-lg">
            {shardpagesLoading ? (
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            ) : (
                <div>
                    {shardpages?.map((shardpage) => (
                        <li
                            key={shardpage.id}
                            onClick={() => {
                                createNewEmptyRequest(MinionFlow.BuildFlow, [
                                    {
                                        type: "body",
                                        key: "shard_id",
                                        value: shardpage.id
                                    },
                                    {
                                        type: "body",
                                        key: "minionType",
                                        value: MinionType.InstallFox
                                    }
                                ], "Set this up for me - " + shardpage.title);
                            }}
                            className="flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2">
                            <PlusIcon className="w-4 h-4" />
                            <span> {shardpage.title} </span>
                        </li>
                    ))}
                </div>
            )}
        </div>
    );
}; 