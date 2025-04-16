'use client';

import { useUser } from "@/utils/hooks/useUser";
import ChatWindow from "./ChatWindow";

export const PlaygroundPage = () => {
    const { user } = useUser();
    if (!user) {
        return null;
    }
    return (
        <ChatWindow userId={user.id} isLoading={false} />
    )
}