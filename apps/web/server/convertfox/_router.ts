import { AiAgentKit } from "@repo/ai-utils/router";
import { z } from "zod";
import { convertfoxClassify } from "./convertfox.classify";
import { convertfoxCreate } from "./job/convertfox.create";
import { convertfoxModify } from "./job/convertfox.modify";
import { createTaskInfo } from "./job/task_tools/createTaskInfo";
import { createTaskIntegrations } from "./job/task_tools/createTaskIntegrations";
import { createTaskStructure } from "./job/task_tools/createTaskStructure";

// TaskCreator - Convert to IntelligentTieringAccessTier, Goal, Summary & List of platforms, isControllableOnFrontend, rquiresInjectionOnWeb, clientSecrets, more specific details.

const convertfoxAgent = new AiAgentKit<any, any, any, any>();

// Register Middlewares
convertfoxAgent.use("/", (ctx, next) => {
  const { request, state, response } = ctx;
  response.writeMessageMetadata({
    minionType: "convertfox",
  });
  return next();
});

// Register agent definitions
convertfoxAgent.actAsTool("/convertfox", {
  description: "Analyze the user's message and determine the type of query",
  inputSchema: z.object({
    query: z.string(),
  }),
});

// Register tools
convertfoxAgent.tool("/:classification/task_info", createTaskInfo);
convertfoxAgent.tool(
  "/:classification/task_integrations",
  createTaskIntegrations
);
convertfoxAgent.tool("/:classification/task_structure", createTaskStructure);

// convertfoxAgent.tool("/modification/task_info", createTaskInfo);
// convertfoxAgent.tool("/modification/task_integrations", createTaskIntegrations);
// convertfoxAgent.tool("/modification/task_structure", createTaskStructure);

// Register agents
convertfoxAgent.agent("/", convertfoxClassify);

convertfoxAgent.use("/confirmation", (ctx, next) => {
  const { state, response } = ctx;
  const { classification, taskInstanceMeta, lastAssistantJob } = state;
  response.writeMessageMetadata({
    loader: "Confirming the task " + lastAssistantJob,
  });
  return next();
});
convertfoxAgent.agent("/confirmation", convertfoxCreate);

convertfoxAgent.use("/modification", (ctx, next) => {
  const { state, response } = ctx;
  const { classification, taskInstanceMeta, lastAssistantJob } = state;
  response.writeMessageMetadata({
    loader: "Modifying the task " + lastAssistantJob,
  });
  return next();
});
convertfoxAgent.agent("/modification", convertfoxModify);

convertfoxAgent.use("/question", (ctx, next) => {
  const { state, response } = ctx;
  const { classification, taskInstanceMeta, lastAssistantJob } = state;
  response.writeMessageMetadata({
    loader: "Answering the question " + lastAssistantJob,
  });
  return next();
});
convertfoxAgent.agent("/question", convertfoxModify);

export default convertfoxAgent;
