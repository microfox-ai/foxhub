import { createChannel, type Channel } from "better-sse";

const taskChannels = new Map<string, Channel>();

export function getTaskChannel(taskId: string): Channel {
  if (!taskChannels.has(taskId)) {
    const newChannel = createChannel();
    taskChannels.set(taskId, newChannel);
    console.log(`Created new SSE channel for task: ${taskId}`);
  }
  return taskChannels.get(taskId)!;
} 
