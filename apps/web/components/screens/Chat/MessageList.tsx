import { Skeleton } from "@mui/material";
import { UIMessage } from "ai";
import dayjs from "dayjs";
import { useMemo } from "react";
import { MessageWrapper } from "./message/MessageWrapper";
import { useChatUI } from "./ChatUiProvider";
import { useMicrofoxChat } from "./MicrofoxChatProvider";

interface TabMessagesProps {
  isLoading: boolean;
}

export default function MessageList({
  isLoading,
}: TabMessagesProps) {

  const { messages, status } = useMicrofoxChat();
  const isStreaming = status === "streaming";
  const { messagesEndRef } = useChatUI();

  const renderDateSeparator = (currentDate: string, prevDate?: string) => {
    if (!prevDate || !dayjs(currentDate).isSame(prevDate, "day")) {
      return (
        <div className="my-2 text-center text-xs font-semibold text-gray-500">
          {dayjs(currentDate).format("DD MMM YYYY")}
        </div>
      );
    }
    return null;
  };

  const lastAnnotationIndices = new Map<string, number>();

  return (
    <>
      {isLoading ? (
        <Skeleton variant="rectangular" width="100%" height={200} />
      ) : messages?.length > 0 ? (
        messages.map((update, index) => {
          return (
            <div
              key={update.id + index}
              className={`${index === messages.length - 1 ? "min-h-[calc(85vh-258px)]" : ""}`}
            >
              <MessageWrapper
                message={update}
                index={index}
                length={messages.length}
                isStreaming={isStreaming}
                lastAnnotationIndices={lastAnnotationIndices}
                renderDateSeperator={(currDate) =>
                  renderDateSeparator(
                    currDate,
                    index > 0
                      ?
                      messages?.[index - 1]?.metadata?.createdAt
                      : ""
                  )
                }
              />
            </div>
          );
        })
      ) : (
        <div className="text-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );
}
