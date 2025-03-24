'use client';

import { useUser } from "@/utils/hooks/useUser";
import ChatWindow from "./ChatWindow";
import { ClientSecretProvider } from "../providers/ClientSecretProvider";

export const PlaygroundPage = () => {
    const { user } = useUser();
    if (!user) {
        return null;
    }
    return (
        <ClientSecretProvider botProjectId={""} userId={user.id}>
            <ChatWindow userId={user.id} />
        </ClientSecretProvider>
    )
}