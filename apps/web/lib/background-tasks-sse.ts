import { createChannel, type Channel } from "better-sse";

export const defaultChannel = createChannel({});

const taskChannels = new Map<string, Channel>();

export function getTaskChannel({
  taskId,
  projectId,
  requestId,
}: {
  taskId: string;
  projectId?: string;
  requestId?: string;
}): Channel {
  if (!taskChannels.has(taskId)) {
    const newChannel = createChannel();
    taskChannels.set(taskId, newChannel);
    console.log(`Created new SSE channel for task: ${taskId}`);
  }
  return taskChannels.get(taskId)!;
}
