"use client";

import { useBackgroundTasksHook } from "@/hooks/use-background-tasks";
import { useState } from "react";

export default function SseTestPage() {
  const [taskId, setTaskId] = useState("a8b39b5e-a98d-475b-8d04-e81125486902");
  const [inputTaskId, setInputTaskId] = useState(
    "a8b39b5e-a98d-475b-8d04-e81125486902"
  );
  const { metadata, response, taskState, isCompleted, error, sseStatus } =
    useBackgroundTasksHook(`/request/a8b39b5e-a98d-475b-8d04-e81125486902`);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    setIsSending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_TASK_API_BASE_URL}/task/${taskId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-task-protection-key": ``,
          },
          body: JSON.stringify({
            taskId: taskId,
            event: "complete",
            data: {
              state: 'completed',
              response: {
                "0": {
                  src: "https://i.pinimg.com/236x/31/f6/37/31f6371453e9776d524b1f964b64b6ec.jpg",
                  srcset: null,
                  responsiveImages: null,
                  alt: "Favorite Puppet 🥀 nel 2025",
                  imgPermalink:
                    "https://in.pinterest.com/pin/73887250132009995/",
                  pagePermalink:
                    "https://in.pinterest.com/pin/73887250132009995/",
                  width: 508,
                  height: 902,
                }
              },
              metadata: {
                packageName: "puppeteer-sls",
                functionName: "extractImagesFromURL",
                triggerEvent: {
                  body: '{"arguments":{"url":"https://in.pinterest.com/pin/73887250132009995/","headless":true}}',
                  headers: [Object],
                  path: "/extractImagesFromURL",
                  pathParameters: [Object],
                  queryStringParameters: null,
                },
                loader: "Completed the task",
              },
              updatedAt: new Date(),
            },
            isClientUpdate: true,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Check console for details.");
    } finally {
      setIsSending(false);
    }
  };

  const handleConnect = () => {
    setTaskId(inputTaskId);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4 text-center text-cyan-400">
          Background Tasks SSE Test
        </h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputTaskId}
            onChange={(e) => setInputTaskId(e.target.value)}
            className="flex-grow bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Enter Task ID"
          />
          <button
            onClick={handleConnect}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
          >
            Connect
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-700 rounded-md">
          <p className="font-semibold">
            Connection Status:{" "}
            <span
              className={`font-bold ${
                sseStatus === "connected" ? "text-green-400" : "text-red-400"
              }`}
            >
              {sseStatus}
            </span>
          </p>
          <p className="font-semibold">
            Task ID:{" "}
            <span className="font-mono text-cyan-300">
              {taskId || "Not connected"}
            </span>
          </p>
        </div>

        <div className="mb-4">
          <button
            onClick={handleSendMessage}
            disabled={isSending || sseStatus !== "connected"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send Mock Event"}
          </button>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 h-64 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">
            Last Received Message:
          </h2>
          <pre className="text-sm text-gray-200 whitespace-pre-wrap">
            Task Status: {taskState || "No status"}
            <br />
            Error: {JSON.stringify(error) || "No error"}
            <br />
            Response: {JSON.stringify(response) || "No response"}
            <br />
            Metadata: {JSON.stringify(metadata) || "No metadata"}
            <br />
            Is Completed: {isCompleted ? "Yes" : "No"}
          </pre>
        </div>
      </div>
    </div>
  );
}
