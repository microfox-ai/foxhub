import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { AiMiddleware } from "@repo/ai-utils/router";

export const convertfoxCreate: AiMiddleware<any, any, any, any> = async (
  ctx
) => {
  const { state, response, request } = ctx;
  const { classification, taskInstanceMeta, convertfox_job } = state;
  switch (convertfox_job) {
    case undefined:
      await ctx.next.callTool("task_info", {
        taskInstanceMeta,
      });
      break;
    case "task_info":
      await ctx.next.callTool("task_integrations", {
        taskInstanceMeta,
      });
      break;
    case "task_integrations":
      await ctx.next.callTool("task_structure", {
        taskInstanceMeta,
      });
      break;
  }
  // Update state
};
