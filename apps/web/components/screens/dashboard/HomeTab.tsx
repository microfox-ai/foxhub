import { ListIcon, PyramidIcon, BotIcon, CornerDownRightIcon } from "lucide-react";
import Link from "next/link";
import { TabProps } from "./types";

export const HomeTab = ({ activeTab, setActiveTab, createNewEmptyRequest }: TabProps) => {
    return (
        <ul className="flex flex-col gap-4 justify-start items-start">
            <li
                onClick={() => setActiveTab("tasks")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "tasks" ? "bg-gray-100" : ""}`}>
                <ListIcon className="w-4 h-4" />
                <span> Show all running tasks </span>
            </li>
            <Link
                href="/my-data"
                onClick={() => setActiveTab("access")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "access" ? "bg-gray-100" : ""}`}>
                <PyramidIcon className="w-4 h-4" />
                <span> Show all connected platforms </span>
            </Link>
            <Link
                href="/my-bots"
                onClick={() => setActiveTab("bots")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "bots" ? "bg-gray-100" : ""}`}>
                <BotIcon className="w-4 h-4" />
                <span> Show all cutom bots </span>
            </Link>
            <li
                onClick={() => {
                    createNewEmptyRequest?.();
                }}
                className="bg-black text-white flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2">
                <CornerDownRightIcon className="w-4 h-4" />
                <span> Start a New Task </span>
            </li>
        </ul>
    );
}; 