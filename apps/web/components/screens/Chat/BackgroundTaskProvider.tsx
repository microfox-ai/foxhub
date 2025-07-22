"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBackgroundTasksHook } from "../../../hooks/use-background-tasks";
import { useClientProject } from "../providers/ClientProjectProvider";
import { useMicrofoxChat } from "./MicrofoxChatProvider";

type BackgroundTaskContextType = ReturnType<typeof useBackgroundTaskProvider>;

const BackgroundTaskContext = createContext<
  BackgroundTaskContextType | undefined
>(undefined);

const useBackgroundTaskProvider = () => {
  const { selectedRequest } = useClientProject();
  const { messages, append } = useMicrofoxChat();
  const [startSSE, setStartSSE] = useState(false);
  const {
    error,
    sseStatus,
    metadata,
    response,
    taskState,
    isCompleted,
    originAssistantMessageId,
    originUserMessageId,
  } = useBackgroundTasksHook(
    startSSE && selectedRequest?.id ? `/request/${selectedRequest.id}` : null
  );

  useEffect(() => {
    if (
      (taskState === "completed" || taskState === "failed") &&
      (originAssistantMessageId || originUserMessageId)
    ) {
      console.log(
        "got task state update",
        taskState,
        originAssistantMessageId,
        originUserMessageId
      );
      let originMessage;
      if (originAssistantMessageId) {
        originMessage = messages.find(
          (message) => message.id === originAssistantMessageId
        );
      }
      if (!originMessage && originUserMessageId) {
        const userMessageIndex = messages.findIndex(
          (message) => message.id === originUserMessageId
        );
        originMessage = messages[userMessageIndex + 1];
      }
      if (!originMessage) return;
      const lastPart = originMessage.parts[originMessage.parts.length - 1];
      append({
        message: {
          role: "assistant",
          id: "text-bg-output-" + originMessage.id,
          metadata: {
            ...originMessage.metadata,
            originMessageId: originAssistantMessageId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          parts: [
            {
              ...lastPart,
              type: (lastPart as any)?.type || "tool-unknown",
              state: "output-available",
              input: (lastPart as any)?.input ?? {},
              output: {
                status: 200,
                contentType: "application/json",
                data: response,
                toolSummary: (lastPart as any)?.output?.toolSummary,
              },
            },
          ],
        },
        bypassAi: true,
      });
    }
  }, [taskState]);

  useEffect(() => {
    if (messages.length > 0) {
      setStartSSE(true);
    }
  }, [messages]);

  // useEffect(() => {
  //   if (messages.length > 0) {
  //     const lastMessage = messages[messages.length - 1];
  //     if (lastMessage) {
  //       const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
  //       if (lastPart && (lastPart as any)?.output?.backgroundTask) {
  //         const taskId = (lastPart as any)?.output?.backgroundTask?.taskId;
  //         const fullOutput = (lastPart as any)?.output?.backgroundTask
  //           ?.fullOutput;
  //         append({
  //           message: {
  //             role: "assistant",
  //             id: "text-placeholder-" + taskId,
  //             parts: [
  //               {
  //                 type: "text",
  //                 text:
  //                   fullOutput?.backgroundTask?.message ??
  //                   "Your task is started, I will notify you when it is completed. Anything else I can help you with?",
  //               },
  //             ],
  //             metadata: {
  //               backgroundTask: fullOutput?.backgroundTask,
  //               createdAt: new Date(),
  //               updatedAt: new Date(),
  //             },
  //           },
  //           bypassAi: true,
  //         });
  //       }
  //     }
  //   }
  // }, [messages]);

  return {
    error,
    sseStatus,
    metadata,
    response,
    taskState,
    isCompleted,
  };
};

interface BackgroundTaskProviderProps {
  children: React.ReactNode;
}

export const BackgroundTaskProvider = ({
  children,
}: BackgroundTaskProviderProps) => {
  const hookResult = useBackgroundTaskProvider();

  return (
    <BackgroundTaskContext.Provider value={hookResult}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export const useBackgroundTasks = () => {
  const context = useContext(BackgroundTaskContext);
  if (context === undefined) {
    throw new Error(
      "useBackgroundTaskContext must be used within a BackgroundTaskProvider"
    );
  }
  return context;
};
