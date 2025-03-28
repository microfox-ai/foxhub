import { Skeleton } from "@mui/material";
import { UIMessage } from "ai";
import dayjs from "dayjs";
import { MessageWrapper } from "./message/MessageWrapper";

interface TabMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isStreaming: boolean;
}

export default function TabMessages({
  messages,
  isLoading,
  messagesEndRef,
  isStreaming,
}: TabMessagesProps) {
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

  return (
    <>
      {isLoading ? (
        <Skeleton variant="rectangular" width="100%" height={200} />
      ) : messages?.length > 0 ? (
        messages.map((update, index) => {
          return (
            <div
              key={update.id}
              className={`${index === messages.length - 1 ? "min-h-[calc(85vh-258px)]" : ""}`}
            >
              <MessageWrapper
                message={update}
                index={index}
                length={messages.length}
                isStreaming={isStreaming}
                renderDateSeperator={(currDate) =>
                  renderDateSeparator(
                    currDate,
                    index > 0
                      ? new Date(
                          messages?.[index - 1]?.createdAt!
                        ).toISOString()!
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
