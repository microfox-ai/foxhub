import { useEffect, useState } from "react";
import useSWRSubscription from "swr/subscription";

export type TaskStatus = "submitted" | "processing" | "completed" | "failed";

export interface TaskUpdate {
  // Define the structure of the data you expect to receive
  [key: string]: any;
}

export const useBackgroundTasksHook = (url: string | null) => {
  const [metadata, setMetadata] = useState<TaskUpdate | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [response, setResponse] = useState<TaskUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [taskState, setTaskState] = useState<string>("");
  const [sseStatus, setSseStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  console.log("task-processing url", url);

  const { data, error: swrError } = useSWRSubscription(
    // Only subscribe if taskId is provided
    (process.env.NEXT_PUBLIC_TASK_API_BASE_URL ?? "") + url,
    (key, { next }) => {
      if (!key) {
        return () => {};
      }
      const eventSource = new EventSource(key);

      eventSource.onopen = () => {
        setSseStatus("connected");
        console.log(`SSE: Connection opened for channel ${url}`);
      };

      eventSource.addEventListener("update", (event: MessageEvent) => {
        try {
          const data: TaskUpdate = JSON.parse(event.data);
          console.log("SSE: update", data);
          setTaskState(data.state);
          setMetadata(data.metadata);
          next(null, data);
        } catch (err) {
          console.error("SSE: Failed to parse SSE message data", err);
        }
      });

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          const data: TaskUpdate = JSON.parse(event.data);
          setTaskState(data.state);
          setMetadata(data.metadata);
          setResponse(data.response);
          setIsCompleted(true);
          next(null, data);
        } catch (err) {
          console.error("SSE: Failed to parse SSE message data", err);
        }
      });

      eventSource.addEventListener("failed", (event: MessageEvent) => {
        try {
          const data: TaskUpdate = JSON.parse(event.data);
          setTaskState(data.state);
          setError(data.error);
          setMetadata(data.metadata);
          setIsCompleted(false);
          next(null, data);
        } catch (err) {
          console.error("SSE: Failed to parse SSE message data", err);
        }
      });

      eventSource.onerror = (err: Event) => {
        setSseStatus("disconnected");
        console.error("SSE Error:", err);
        // Do not call next(err) for reconnection attempts
      };

      return () => {
        eventSource.close();
        setSseStatus("disconnected");
        console.log(`SSE: Connection closed for channel ${url}`);
      };
    }
  );

  useEffect(() => {
    if (data) {
      console.log("data", data);
    }
  }, [data]);

  useEffect(() => {
    if (swrError) {
      setError(swrError);
    }
  }, [swrError]);

  return {
    error,
    sseStatus,
    metadata,
    response,
    taskState,
    isCompleted,
  };
};
