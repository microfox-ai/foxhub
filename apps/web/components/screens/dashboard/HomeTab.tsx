import { ListIcon, PyramidIcon, BotIcon, CornerDownRightIcon, Link2Icon } from "lucide-react";
import Link from "next/link";
import { TabProps } from "./types";
import { MinionFlow } from "../hooks/convertors";
import { IN_STAGING } from "@/utils/constants/appInfo";
import { useAuth } from "@/components/auth/AuthProvider";

export const HomeTab = ({ activeTab, setActiveTab, createNewEmptyRequest }: TabProps) => {
    const { user } = useAuth();
    return (
        <ul className="flex flex-col gap-4 justify-start items-start">
            {user?.isAdmin && <li
                onClick={() => setActiveTab("tasks")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "tasks" ? "bg-gray-100" : ""}`}>
                <ListIcon className="w-4 h-4" />
                <span> Show all running tasks </span>
            </li>}
            <Link
                href="/my-data"
                onClick={() => setActiveTab("access")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "access" ? "bg-gray-100" : ""}`}>
                <Link2Icon className="w-4 h-4" />
                <span> Show all my connected platforms </span>
            </Link>
            <Link
                href="/my-bots"
                onClick={() => setActiveTab("bots")}
                className={`flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2 ${activeTab === "bots" ? "bg-gray-100" : ""}`}>
                <BotIcon className="w-4 h-4" />
                <span> Show all my created custom bots </span>
            </Link>
            {IN_STAGING && user?.isAdmin && (
                <li
                    onClick={() => {
                        createNewEmptyRequest?.();
                    }}
                    className="bg-white text-black flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2">
                    <CornerDownRightIcon className="w-4 h-4" />
                    <span> Build a New Automation </span>
                </li>
            )}
            <li
                onClick={() => {
                    createNewEmptyRequest?.(
                        MinionFlow.ChatFlow
                    );
                }}
                className="bg-black text-white flex flex-row gap-2 px-4 cursor-pointer items-center justify-start border border-gray-200 rounded-lg p-2">
                <CornerDownRightIcon className="w-4 h-4" />
                <span> Start a New Chat </span>
            </li>
        </ul>
    );
}; 