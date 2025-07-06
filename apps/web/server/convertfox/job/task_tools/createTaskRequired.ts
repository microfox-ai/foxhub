// import { generateObject, tool } from "ai";
// import { z } from "zod";
// import { models } from "../models";
// import { TaskInfo, taskRequiredInfo, TaskIntegrations } from "./types";
// import { TokenUsageAnalyticsTracker } from "../analytics/helper";
// import { AiToolFactory } from "@microfox/ai-router";

// type CreateTaskRequiredToolMetadata = {
//   loader?: string;
//   taskFinalisedSummary?: TaskInfo;
//   taskIntegrations?: TaskIntegrations;
// };

// export const createTaskRequiredInfo: AiToolFactory<
//   CreateTaskRequiredToolMetadata,
//   any,
//   any,
//   any
// > = (ctx) => {
//   return tool<
//     {
//       taskFinalisedSummary: TaskInfo;
//       taskIntegrations: TaskIntegrations;
//     },
//     {
//       taskRequiredInfo: any;
//     }
//   >({
//     description:
//       "Creates task required information by determining necessary details from client.",
//     inputSchema: z.object({
//       taskFinalisedSummary: z.object({
//         name: z.string(),
//         goal: z.string(),
//         summary: z.string(),
//       }),
//       taskIntegrations: z.object({
//         platforms: z.array(z.any()),
//       }),
//     }),
//     execute: async (
//       { taskFinalisedSummary, taskIntegrations },
//       { messages, toolCallId }
//     ) => {
//       const taskInfo = taskFinalisedSummary;

//       ctx.response.writeMessageMetadata({
//         loader: "Searching for related existing packages",
//       });

//       // SEARCH FOR PACKAGES & CLIENT SECRETS
//       //   const packages = await searchPackages({
//       //     query: taskIntegrations.platforms,
//       //   });

//       const result = await generateObject({
//         model: models.googleGeminiFlash,
//         system: `
//             You analyze the task information & determine the necessary details from client we need to collect.
//             clientSecrets:

//              ---
//             You run in a loop of Thought, Action, PAUSE, Observation.
//             At the end of the loop you output an Answer
//             Use Thought to describe your thoughts about the question you have been asked.
//             Use Action to run one of the actions available to you - then return PAUSE.
//             Observation will be the result of running those actions.
//             At the end of the loop you output an Answer
//         `,
//         schema: taskRequiredInfo,
//         prompt: `
// Task Goal: ${taskInfo.goal}
// Task Summary: ${taskInfo.summary}
// Task Platforms: ${taskIntegrations.platforms}
//         `,
//       });
//       TokenUsageAnalyticsTracker.trackUsage({
//         ...ctx.request,
//         model: models.googleGeminiFlash.modelId,
//         usage: result.usage,
//       });

//       const _taskRequiredInfo = {
//         ...result.object,
//         packages: [],
//       };

//       ctx.response.writeCustomTool({
//         toolName: "createTaskRequiredInfoAction",
//         input: {
//           type: "ui",
//           objectType: "taskRequiredInfo",
//           object: _taskRequiredInfo,
//           persona: "taskManager",
//           text: "Here are the details we need from you to build the task",
//         },
//       });

//       if (ctx.state.taskInstanceMeta) {
//         ctx.state.taskInstanceMeta.taskRequiredInfo = _taskRequiredInfo;
//       }

//       return {
//         taskRequiredInfo: _taskRequiredInfo,
//       };
//     },
//   });
// };
