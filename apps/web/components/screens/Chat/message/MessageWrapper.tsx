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
import { AnnotationUIList } from "./AnnotationUIList";
import { ToolInvocationPart } from "./ToolInvocationPart";

// Define types for annotations
type ThinkingAnnotation = {
  type: "thinking";
  contents: string;
  content: string;
};

type LoadingAnnotation = {
  type: "loading";
  text: string;
  content: string;
  contents: string;
};

type StatusAnnotation = ThinkingAnnotation | LoadingAnnotation;

// TODO: error boundary for ui annotations
//import { ErrorBoundary } from "react-error-boundary";
interface MessageWrapperProps {
  message: UIMessage;
  index: number;
  renderDateSeperator: (currentDate: string) => React.ReactNode;
  length: number;
  isStreaming: boolean;
}

type MessagePartType = UIMessage["parts"][number];

const MessagePart = ({
  part,
  messageId,
}: {
  part: MessagePartType;
  messageId: string;
}) => {
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

// RENDER CONTENT BY PARTS AND NOT BY CONTENT, BECAUSE CONTENT MIGHT BE A MERGE OF MULTIPLE PARTS.
export const MessageWrapper = ({
  message,
  index,
  renderDateSeperator,
  length,
  isStreaming,
}: MessageWrapperProps) => {
  const { handleRefresh, status } = useMicrofox();
  const annotations = message.annotations;
  const core = annotations?.find((a) => (a as any).type === "core");
  const metadata = (
    annotations?.find((a) => (a as any).type === "metadata") as any
  )?.metadata as MessageMetadata;
  const systemType = annotations?.find((a) => (a as any).type === "systemType");
  const minion = annotations?.find((a) => (a as any).type === "minion");

  const displayParts = message.parts?.filter(
    (part) => part.type !== "tool-invocation"
  );
  const toolInvocations = message.parts?.filter(
    (part) => part.type === "tool-invocation"
  );
  const [activeTab, setActiveTab] = useState<number>(0);
  useEffect(() => {
    if (displayParts && isStreaming) {
      setActiveTab(displayParts.length - 1);
    }
  }, [displayParts, isStreaming]);

  const simpleAnnotations = message.annotations?.filter(
    (a: any) => a.type !== "metadata" && a.type !== "ui"
  );
  const uiAnnotations = message.annotations?.filter(
    (a: any) => a.type === "ui"
  );
  const onRefresh = async () => {
    await handleRefresh(index);
  };

  // Get the latest thinking or loading annotation
  const getLatestStatusAnnotation = (): StatusAnnotation | null => {
    if (!message.annotations) return null;
    const statusAnnotations = message.annotations.filter(
      (a: any): a is StatusAnnotation =>
        a.type === "thinking" || a.type === "loading"
    );
    return statusAnnotations[statusAnnotations.length - 1] || null;
  };

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
                className={`mb-3 text-[10px] font-light ${(message.role as any) === "user" ? "text-gray-500 ml-auto" : "text-gray-500 mr-auto"}`}
              >
                {dayjs(message.createdAt).format("h:mm A")}
              </span>
            )}
            {status === "error" &&
              message.role === "assistant" &&
              !message.content &&
              (!toolInvocations || toolInvocations.length === 0) &&
              (!uiAnnotations || uiAnnotations.length === 0) && (
                <div className="text-red-500">
                  Something went wrong! Try again.
                </div>
              )}
            {message.role === "assistant" &&
              status !== "ready" &&
              status !== "error" &&
              index === length - 1 &&
              !message.content &&
              (!toolInvocations || toolInvocations.length === 0) &&
              (!uiAnnotations || uiAnnotations.length === 0) && (
                <div className="flex gap-2 items-center">
                  <div className="bg-black/80 animate-bounce h-4 w-4 rounded-full p-0 text-xs text-white"></div>
                  {(() => {
                    const latestAnnotation = getLatestStatusAnnotation();
                    if (!latestAnnotation) return null;

                    const content =
                      latestAnnotation.type === "thinking"
                        ? latestAnnotation.contents || latestAnnotation.content
                        : latestAnnotation.text ||
                          latestAnnotation.content ||
                          latestAnnotation.contents;

                    return (
                      <div className="relative bg-repeat text-transparent bg-clip-text first-letter:uppercase  overflow-hidden animate-shimmer bg-gradient-to-r from-gray-400 via-gray-800 to-gray-400 bg-[length:200%_100%]">
                        {content}
                      </div>
                    );
                  })()}
                </div>
              )}

            {message.content &&
              message.content.length > 0 &&
              displayParts.length === 1 && (
                <Markdown>{message.content}</Markdown>
              )}
            {displayParts.length > 1 && (
              <div className="w-[400px] p-0 bg-transparent">
                <div className="flex gap-1 mb-3 bg-transparent">
                  <ChevronLeft
                    className={`h-4 w-4 text-gray-500 cursor-pointer ${
                      activeTab > 0 ? "opacity-100" : "opacity-50"
                    }`}
                    onClick={() => setActiveTab(activeTab - 1)}
                  />
                  <div
                    className={`text-xs p-0 bg-transparent hover:text-black cursor-pointer`}
                  >
                    Step {activeTab + 1}
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 text-gray-500 cursor-pointer ${
                      activeTab < displayParts?.length - 1
                        ? "opacity-100"
                        : "opacity-50"
                    }`}
                    onClick={() => setActiveTab(activeTab + 1)}
                  />
                </div>
                {displayParts?.[activeTab] && (
                  <MessagePart
                    part={displayParts?.[activeTab]}
                    messageId={message.id}
                  />
                )}
                {toolInvocations?.map((toolInvocation, idx) => (
                  <ToolInvocationPart
                    key={idx + toolInvocation.type}
                    part={toolInvocation}
                    messageId={message.id}
                  />
                ))}
              </div>
            )}
            {uiAnnotations && uiAnnotations.length > 0 && (
              <AnnotationUIList uiAnnotations={uiAnnotations as any[]} />
            )}
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
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
