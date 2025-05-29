import { TaskInstanceMeta } from "@prisma/client";

export const modifyTaskInstanceMeta = (
  taskInstanceMeta: TaskInstanceMeta,
  {
    filesChanged,
    enableGitFetch,
    commitSha,
  }: {
    filesChanged: string[];
    enableGitFetch: boolean;
    commitSha: string;
  }
) => {
  console.log("filesChanged", filesChanged);
  // TODO: based on files changed, update the task instance meta
  return taskInstanceMeta as any;
};
