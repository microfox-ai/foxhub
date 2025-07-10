import React, { createContext, useContext, useEffect, useState } from "react";
import { UIMessage } from "ai";
import { getDisplayParts, getStickyUiParts, getToolParts, getUiParts } from "./helpers/parts";
import { useMicrofoxChat } from "./MicrofoxChatProvider";



type MessageContextType = ReturnType<typeof useMessageContext>;

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export interface MessageProviderProps {
    children: React.ReactNode;
    message: UIMessage;
}

export const useMessageContext = ({ message }: { message: UIMessage }) => {
    const [activePart, setActivePart] = useState<number>(0);
    const displayParts = getDisplayParts(message);
    const uiParts = getUiParts(message);
    const toolParts = getToolParts(message);
    const stickyUiParts = getStickyUiParts(uiParts);

    const { status } = useMicrofoxChat();

    useEffect(() => {
        if (displayParts && displayParts.length > 1) {
            setActivePart(displayParts.length - 1);
        }
    }, []);

    useEffect(() => {
        if (displayParts && status === "streaming") {
            setActivePart(displayParts.length - 1);
        }
    }, [displayParts, status]);

    return {
        activePart,
        setActivePart,
        displayParts,
        uiParts,
        toolParts,
        stickyUiParts,
        message,
    };
};

export const MessageProvider: React.FC<MessageProviderProps> = ({
    children,
    message,
}) => {
    const value = useMessageContext({ message });
    return (
        <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
    );
};

export const useMessageParts = () => {
    const context = useContext(MessageContext);
    if (context === undefined) {
        throw new Error("useMessage must be used within a MessageProvider");
    }
    return context;
};
