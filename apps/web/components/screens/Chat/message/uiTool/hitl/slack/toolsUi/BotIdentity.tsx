import React, { useEffect, useState } from "react";
import { MultiSelectInput, StringInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfos } from '../dataFetchers';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";
import { components, operations } from "../slack";
import { SlackUser } from "../objects";
import { CheckCircle, X } from "lucide-react";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { Skeleton } from "@/components/ui/skeleton";

interface BotIdentityProps {
    iconUrl: string;
    username: string;
    onIconChange: (url: string | null) => void;
    onUsernameChange: (name: string) => void;
}

export const BotIdentity: React.FC<BotIdentityProps> = ({
    iconUrl,
    username,
    onIconChange,
    onUsernameChange,
}) => {
    return (
        <div className="flex flex-row items-center gap-2">
            <ImageUpload
                value={iconUrl}
                onImageSelect={onIconChange}
            />
            <div className="flex flex-col gap-2">
                <StringInput
                    value={username}
                    onChange={onUsernameChange}
                    className="border-none -ml-2 focus-visible:ring-0 text-lg font-bold leading-none! h-3"
                    placeholder="Enter a username to override the default"
                />
                <p className="text-xs opacity-50 max-w-[20ch]">
                    The image & name will be used as the bot's avatar.
                </p>
            </div>
        </div>
    );
};