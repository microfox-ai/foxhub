import { UIMessage } from "ai";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, FileText, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { getDisplayParts, getStickyUiParts, getUiParts } from "../helpers/parts";
import { getMessageClass } from "../helpers/ui";
import { useMicrofoxChat } from "../MicrofoxChatProvider";
import { LoadingIndicator } from "./LoadingIndicator";
import { DisplayPart } from "./wrappers/DisplayPart";
import { RenderUiTool } from "./wrappers/RenderUiTool";
import { StickyUiPartsWrapper } from "./wrappers/StickyUiPartsWrapper";

// Define types for annotations
export type ThinkingAnnotation = {
  type: "thinking";
  contents: string;
  content: string;
};

export type LoadingAnnotation = {
  type: "loading";
  text: string;
  content: string;
  contents: string;
};

export type StatusAnnotation = ThinkingAnnotation | LoadingAnnotation;

// TODO: error boundary for ui annotations
//import { ErrorBoundary } from "react-error-boundary";
interface MessageWrapperProps {
  message: UIMessage<any, any, any>;
  index: number;
  renderDateSeperator: (currentDate: string) => React.ReactNode;
  length: number;
  lastAnnotationIndices: Map<string, number>;
}

// RENDER CONTENT BY PARTS AND NOT BY CONTENT, BECAUSE CONTENT MIGHT BE A MERGE OF MULTIPLE PARTS.
export const MessageWrapper = ({
  message,
  index,
  renderDateSeperator,
  length,
  lastAnnotationIndices,
}: MessageWrapperProps) => {
  const { handleRefresh, status } = useMicrofoxChat();
  const systemType = message.metadata?.systemType;
  const minion = message.metadata?.minionType;

  const displayParts = getDisplayParts(message);
  const uiParts = getUiParts(message);
  const stickyUiParts = getStickyUiParts(uiParts);

  const [activeTab, setActiveTab] = useState<number>(0);
  useEffect(() => {
    if (displayParts && displayParts.length > 1) {
      setActiveTab(displayParts.length - 1);
    }
  }, []);

  useEffect(() => {
    if (displayParts && status === "streaming") {
      setActiveTab(displayParts.length - 1);
    }
  }, [displayParts, status]);

  // const uiAnnotations = message.metadata?.uiAnnotations;
  const onRefresh = async () => {
    await handleRefresh(index);
  };

  return (
    <div key={message.id + index}>
      {message.metadata?.createdAt && renderDateSeperator(new Date(message.metadata?.createdAt)?.toISOString())}
      {message.role === "system" ? (
        <div className="my-2 text-center text-xs text-gray-600">
          {message.metadata?.content} • {message.metadata?.createdAt && dayjs(message.metadata?.createdAt).format("h:mm A")}
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
                {message.metadata?.createdAt && dayjs(message.metadata?.createdAt).format("h:mm A")}
              </span>
            )}
            {status !== "streaming" &&
              message.role === "assistant" &&
              message.metadata?.error && (
                <div className="text-red-500">
                  {message.metadata?.error || "Something went wrong! Try again."}
                </div>
              )}
            {message.role === "assistant" &&
              status === "streaming" &&
              index === length - 1 &&
              //(!message.content || message.content?.trim()?.length === 0) &&
              (
                <LoadingIndicator message={message} />
              )}
            {/* {IN_DEV && (
              <div className="text-xs bg-red-800">
                {message.annotations?.map((a: any, idx: number) => (
                  <div key={idx + a.type} className="text-xs text-white bg-red-500 my-2">
                    {a.type} - {typeof a.value === "string" ? a.value : a.key ?? "no key"} - {a.content} - {a.text} - {a.contents}
                  </div>
                ))}
              </div>
            )} */}

            {message.parts &&
              message.parts.length > 0 &&
              displayParts.length === 1 && (
                <DisplayPart
                  part={displayParts?.[0] as any}
                  messageId={message.id}
                  lastMessage={index === length - 1}
                  lastAnnotationIndices={lastAnnotationIndices}
                  messageIndex={index}
                />
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
                  <DisplayPart
                    part={displayParts?.[activeTab]}
                    messageId={message.id}
                    lastMessage={index === length - 1}
                    lastAnnotationIndices={lastAnnotationIndices}
                    messageIndex={index}
                  />
                )}
                {/* {message.customTools?.map((toolInvocation, idx) => (
                  <ToolInvocationPart
                    key={idx + toolInvocation.type}
                    part={toolInvocation}
                    messageId={message.id}
                    message={message}
                  />
                ))} */}
              </div>
            )}
            {/* {uiAnnotations && uiAnnotations.length > 0 && (
              <AnnotationUIList
                uiAnnotations={uiAnnotations as any[]}
                lastMessage={index === length - 1}
                lastAnnotationIndices={lastAnnotationIndices}
                messageIndex={index}
              />
            )} */}
            {stickyUiParts.length > 0 && (
              <StickyUiPartsWrapper>
                {stickyUiParts.map((part) => (
                  <RenderUiTool key={part.toolCallId} tool={part} lastMessage={index === length - 1} lastAnnotationIndices={lastAnnotationIndices} messageIndex={index} />
                ))}
              </StickyUiPartsWrapper>
            )}
            {/* {lastToolInvocation && (
              <div className="mt-2 flex flex-col gap-2">
                <ToolInvocationPart
                  part={lastToolInvocation}
                  messageId={message.id}
                  message={message}
                />
              </div>
            )} */}
            {message.metadata?.attachments && (
              <div className="mt-2 flex flex-wrap justify-evenly gap-2">
                {message.metadata?.attachments.map((m: any, idx: number) =>
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
