import { findLastElementWith } from "@/utils/helpers/array";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { getTextParts, getTextPartsContent } from "@repo/ai-utils/helper";
import { AiMiddleware } from "@microfox/ai-router";

export const convertfoxModify: AiMiddleware<any, any, any, any> = async (
  ctx
) => {
  const { state, response } = ctx;
  const { classification, taskInstanceMeta, convertfox_job } = state;
  const lastUserMessage = findLastElementWith(
    ctx.request.messages,
    (m: any) => m.role === "user"
  );

  if (!lastUserMessage || getTextPartsContent(lastUserMessage) === "") {
    throw new Error("No valid user message found");
  }

  console.log("lastUserMessage", state);
  const userContent = getTextPartsContent(lastUserMessage);

  console.log("modification", classification);
  switch (convertfox_job) {
    case "task_info":
      await ctx.next.callTool("/task_info", {
        taskInstanceMeta,
        userContent,
      });
      break;
    case "task_integrations":
      await ctx.next.callTool("/task_integrations", {
        taskInstanceMeta,
        userContent,
      });
      break;
    case "task_structure":
      await ctx.next.callTool("/task_structure", {
        taskInstanceMeta,
        userContent,
      });
      break;
  }

  console.log("taskInstanceMeta", taskInstanceMeta);
};
