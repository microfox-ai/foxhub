import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChat, UseChatHelpers, UseChatOptions } from "@ai-sdk/react";
import { ChatUIMessageWithTypes } from "../hooks/convertors";
import { useFileUpload } from "./FileUploadProvider";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useSWR from "swr";
import { ClientRequest } from "@prisma/client";
import useLocalState from '../hooks/useLocalState';

interface MicrofoxContextType extends UseChatHelpers {
    minionType: ChatUIMessageWithTypes["minionType"] | null;
    setMinionType: (type: ChatUIMessageWithTypes["minionType"] | null) => void;
    serverMessages?: ChatUIMessageWithTypes[];
    mutate: () => void;
    isLoading: boolean;
    isValidating: boolean;
    addToolResult: ({ toolCallId, result, }: {
        toolCallId: string;
        result: any;
    }) => void;
    // ... spread all chat options
}

const MicrofoxContext = createContext<MicrofoxContextType | undefined>(undefined);

export interface MicrofoxProviderProps {
    children: React.ReactNode;
    clientRequest?: ClientRequest;
    resetInputState?: () => void;
    chatOptions?: Partial<UseChatOptions>;
}

export const MicrofoxProvider: React.FC<MicrofoxProviderProps> = ({
    children,
    clientRequest,
    resetInputState,
    chatOptions: userChatOptions,
}) => {
    const [minionType, setMinionType] = useLocalState<ChatUIMessageWithTypes["minionType"] | null>("minionType", "hellofox");
    const { mediaPayload } = useFileUpload();

    const {
        data: serverMessages,
        mutate,
        isValidating,
        isLoading,
    } = useSWR<ChatUIMessageWithTypes[]>(
        `/api/client-requests/chat/update?requestId=${clientRequest?.id}`,
        async (url: string) => {
            const res = await PortalSdk.getData(url, {});
            return res.chatUIMessages;
        },
    );

    const chatOptions = useChat({
        api: "/api/chat",
        initialMessages: [],
        initialInput: "",
        ...userChatOptions,
        experimental_prepareRequestBody: (options) => {
            return {
                ...options,
                minionType,
                media: mediaPayload,
                originClientRequestId: clientRequest?.id,
                userId: clientRequest?.userId,
            };
        },
        onResponse: (response) => {
            console.log(response);
        },
        onError: (error) => {
            console.log(error);
        },
    });

    useEffect(() => {
        console.log("messages", chatOptions.messages);
    }, [chatOptions.messages]);

    useEffect(() => {
        console.log("minionType", chatOptions.data);
    }, [chatOptions.data]);

    const value = {
        minionType,
        setMinionType,
        ...chatOptions,
        mutate,
        isLoading,
        isValidating,
        serverMessages,
    };

    return (
        <MicrofoxContext.Provider value={value}>
            {children}
        </MicrofoxContext.Provider>
    );
};

// Custom hook to use the Microfox context
export const useMicrofox = () => {
    const context = useContext(MicrofoxContext);
    if (context === undefined) {
        throw new Error('useMicrofox must be used within a MicrofoxProvider');
    }
    return context;
}; 