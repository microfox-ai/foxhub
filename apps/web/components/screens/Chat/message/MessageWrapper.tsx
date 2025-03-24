import { UIMessage } from "ai";
import { ChevronLeft, ChevronRight, FileText, RefreshCcw } from "lucide-react";
import dayjs from "dayjs";
import { getMessageClass } from "../helpers/ui";
import { MessageMetadata } from "../../hooks/convertors";
import { Markdown } from "./markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ChatUIMessage } from "@prisma/client";
import { useMicrofox } from "../../providers/MicrofoxProvider";
import { Button } from "@/components/ui/button";
import { IN_DEV } from "@/utils/constants/appInfo";

interface MessageWrapperProps {
  message: UIMessage;
  index: number;
  renderDateSeperator: (currentDate: string) => React.ReactNode;
  onRefresh: () => void;
  length: number;
  isStreaming: boolean;
}

type MessagePartType = UIMessage["parts"][number];

const MessagePart = ({ part, messageId }: { part: MessagePartType, messageId: string }) => {

  if (part.type === "text") {
    return <Markdown>{part.text}</Markdown>;
  }

  if (part.type === "reasoning") {
    return <Markdown>{part.reasoning}</Markdown>;
  }

  if (part.type === "source") {
    return <Markdown>{part.source.url}</Markdown>;
  }
};

const ToolInvocationPart = ({ part, messageId }: { part: MessagePartType, messageId: string }) => {

  const { setMinionType, setMessages, status, append, handleSubmit, setInput } = useMicrofox();

  if (status === "streaming") {
    return null;
  }

  const removeThisPart = () => {
    setMessages((messages) => messages.map((m) => {
      if (m.id === messageId) {
        return {
          ...m,
          parts: m.parts?.filter((p: any) => JSON.stringify(p) !== JSON.stringify(part)),
        };
      }
      return m;
    }));
  }

  if (part.type === "tool-invocation" && part.toolInvocation.state === "result") {
    return (
      <div className="flex flex-col gap-2 my-4">
        {part.toolInvocation.result.buttons && (
          <div className="flex flex-wrap gap-2">
            {part.toolInvocation.result.buttons.map((button: any) => (
              <Button
                variant={"default"}
                key={button.text} className={`text-sm text-black px-2 py-2 rounded-xl cursor-pointer ${button.className}`}
                onClick={() => {
                  if (button.action === "shiftMinion") {
                    setMinionType(button.value);
                    setInput("");
                    handleSubmit();
                  }
                  if (button.action === "removeThisPart") {
                    removeThisPart();
                  }
                }}
              >
                {button.text}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }
}

// RENDER CONTENT BY PARTS AND NOT BY CONTENT, BECAUSE CONTENT MIGHT BE A MERGE OF MULTIPLE PARTS.
export const MessageWrapper = ({
  message,
  index,
  renderDateSeperator,
  onRefresh,
  length,
  isStreaming,
}: MessageWrapperProps) => {
  const annotations = message.annotations;
  const core = annotations?.find((a) => (a as any).type === "core");
  const metadata = (
    annotations?.find((a) => (a as any).type === "metadata") as any
  )?.metadata as MessageMetadata;
  const systemType = annotations?.find((a) => (a as any).type === "systemType");
  const minion = annotations?.find((a) => (a as any).type === "minion");

  const displayParts = message.parts?.filter(
    (part) =>
      part.type !== "tool-invocation",
  );
  const toolInvocations = message.parts?.filter(
    (part) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.state === "result" &&
      part.toolInvocation.result.text != null,
  );
  const [activeTab, setActiveTab] = useState<number>(0);
  useEffect(() => {
    if (displayParts && isStreaming) {
      setActiveTab(displayParts.length - 1);
    }
  }, [displayParts, isStreaming]);

  return (
    <div key={message.id}>
      {renderDateSeperator(new Date(message.createdAt!).toISOString()!)}
      {message.role === "system" ? (
        <div className="my-2 text-center text-xs text-gray-600">
          {message.content} • {dayjs(message.createdAt).format("h:mm A")}
        </div>
      ) : (
        <div
          className={`group flex items-start gap-3 ${(message.role as any) === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.role == "user" && index <= length - 1 && (
            <RefreshCcw
              className="h-4 w-4 text-neutral-500 cursor-pointer self-center opacity-0 group-hover:opacity-100 hover:text-neutral-700"
              onClick={onRefresh}
            />
          )}
          <div
            className={`relative flex flex-col max-w-xs rounded-lg p-3 sm:max-w-md ${getMessageClass(message.role as any)}`}
          >
            {message.role != "user" && (
              <span
                className={` mb-3 text-[10px] font-light ${(message.role as any) === "user" ? "text-gray-500 ml-auto" : "text-gray-500 mr-auto"}`}
              >
                {dayjs(message.createdAt).format("h:mm A")}
              </span>
            )}
            {IN_DEV && message.annotations?.map((annotation: any, idx: number) => {
              if (!annotation) return null;
              if (annotation.type === "metadata") {
                return <div key={annotation.type + idx}>{annotation.metadata}</div>;
              }
              return <div key={annotation.type + idx}>{annotation.content ?? annotation.text}</div>;
            })}
            {message.content && message.content.length > 0 && displayParts.length === 1 && (
              <Markdown>{message.content}</Markdown>
            )}
            {displayParts.length > 1 && (
              <div className="w-[400px] p-0 bg-transparent">
                <div className="flex gap-1 mb-3 bg-transparent">
                  <ChevronLeft
                    className={`h-4 w-4 text-gray-500 cursor-pointer ${activeTab > 0 ? "opacity-100" : "opacity-50"
                      }`}
                    onClick={() => setActiveTab(activeTab - 1)}
                  />
                  <div
                    className={`text-xs p-0 bg-transparent hover:text-black cursor-pointer`}
                  >
                    Step {activeTab + 1}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-gray-500 cursor-pointer ${activeTab < displayParts?.length - 1
                      ? "opacity-100"
                      : "opacity-50"
                      }`}
                    onClick={() => setActiveTab(activeTab + 1)}
                  />
                </div>
                {displayParts?.[activeTab] && (
                  <MessagePart part={displayParts?.[activeTab]} messageId={message.id} />
                )}
                {toolInvocations?.map((toolInvocation, idx) => (
                  <ToolInvocationPart key={idx + toolInvocation.type} part={toolInvocation} messageId={message.id} />
                ))}
              </div>
            )}
            {/* {message.parts && message.parts.map((part: any) => {
                            return <Markdown>{part.text}</Markdown>
                        })} */}
            {metadata?.media && (
              <div className="mt-2 flex flex-wrap justify-evenly gap-2">
                {metadata.media.map((m: any, idx: number) =>
                  m?.mediaType?.startsWith("image") ? (
                    <img
                      key={idx}
                      src={m.mediaUrl}
                      alt={m.mediaName}
                      className={`rounded object-cover ${(message.role as any) === "user" ? "max-h-60" : "max-h-20"}`}
                    />
                  ) : (
                    <a key={idx} href={m.mediaUrl} target="_blank">
                      <span className="flex items-center gap-1">
                        <FileText className="h-12 w-12 text-gray-600" />
                        {m.mediaName}
                      </span>
                    </a>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
