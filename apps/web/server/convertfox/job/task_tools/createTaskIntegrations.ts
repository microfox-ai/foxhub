import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  PackageInfoHelper,
  findSimilarPackages,
  PackageDbInfo,
} from "@/utils/services/embeddings/packageSearch";
import { MySlackChannels, slackBotSdk } from "@/utils/services/slackBotSdk";
import { generateObject, streamText, tool } from "ai";
import { z } from "zod";
import dedent from "dedent";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { models } from "../../../models";
import { PackageStatus } from "../../../types";
import {
  taskInstance,
  TaskInstanceMetaType,
  taskIntegrations,
} from "../../helpers/types";
import { IN_STAGING } from "@/utils/constants/appInfo";
import { AiToolFactory } from "@microfox/ai-router";
import { uiTool } from "@/components/screens/Chat/message/uiTool/mappers/uiTool";

type CreateTaskIntegrationsToolMetadata = {
  loader?: string;
  taskInstanceMeta?: TaskInstanceMetaType;
  modification?: string;
  convertfox_job?: string;
};

// IMPORTANT TODO: create another multi-agent workflow to figure out the platform, package, auth method, etc. (check types.ts for more details)
// THIS OPERATION IS USELESSY CALLING AI TOO MANY TIMES BECAUSE OF IMPORPER EMBEDDING USAGE.
export const createTaskIntegrations: AiToolFactory<
  CreateTaskIntegrationsToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  const { classification } = ctx.request.params || {};
  return tool<
    {
      taskInstanceMeta?: any;
      modification?: string;
    },
    {
      taskIntegrations: any;
    }
  >({
    description:
      classification === "modification"
        ? "Modifies task integrations by identifying required platforms and packages."
        : "Creates task integrations by identifying required platforms and packages.",
    inputSchema:
      classification === "modification"
        ? z.object({
            taskInstanceMeta: taskInstance.or(z.any()),
            modification: z.string().optional(),
          })
        : z.object({
            taskInstanceMeta: taskInstance.or(z.any()),
          }),
    execute: async (
      { taskInstanceMeta, modification },
      { messages, toolCallId }
    ) => {
      const taskInfo = taskInstanceMeta.taskInfo;

      if (!taskInfo) {
        throw new Error("Task info not found");
      }

      ctx.response.writeMessageMetadata({
        loader: "Searching for platforms we need to integrate with",
      });

      // serach internal packages for each platform & attach them to the platform
      const packageList = await PackageInfoHelper.getAllPackages({
        statuses: IN_STAGING
          ? [
              PackageStatus.STABLE,
              PackageStatus.SEMISTABLE,
              PackageStatus.EXTERNAL,
            ]
          : [PackageStatus.STABLE, PackageStatus.EXTERNAL],
      });

      console.log(
        "packageList",
        packageList.map((pkg) => pkg.package_name)
      );
      console.log("taskInfo", JSON.stringify(taskInfo, null, 2));

      // Step 1: Generate search queries
      const searchQueriesResult = await generateObject({
        model: models.googleGeminiTwoFive,
        system: `
          You are an expert software architect and a senior full-stack developer. Your primary goal is to deconstruct a user's task/request into a series of platforms/packages that are most likely to be used to accomplish the task.

          ---
          **Process Flow:**
            -   You run in a loop of Thought, Action, PAUSE, Observation.
            -   At the end of the loop you output an Answer.
            -   Use Thought to describe your thoughts about the question you have been asked.
            -   Use Action to run one of the actions available to you - then return PAUSE.
            -   Observation will be the result of running those actions.
            -   At the end of the loop you output an Answer.
          ---

          **Steps:**
          1.  **Deconstruction (Thought)**:
              -   Analyze the user's request (Name, Goal, Summary).
              -   Break down the goal into smaller, concrete programming steps or functions that would be needed.

          2.  **Initial Platform Selection (Action)**:
              -   Based on your deconstruction, generate a list of precise platforms/packages. Each platform/package should target a specific platform/package that is most likely to be used to accomplish the task.

          3.  **Introspection and Refinement (Observation)**:
              -   Critically review your generated platforms. Ask yourself:
                  -   Is this platform relevant for the user's task/request?
                  -   Is there any other platform that is more likely to be used to accomplish the task?
                  -   Is there any important requirement/service/feature from the user's task/request that is not covered by any of the platforms/packages?

          4.  **Final Answer (Output)**:
              -   After refining your list, provide the final, high-quality, and meaningful platforms/packages in the specified JSON format:
                -   platform: The platform/package that is most likely to be used to accomplish the task/request
                -   alternativePlatforms: Array of probable platforms/packages which can also be used to accomplish the task/request.
                -   searchQuery: A concise and fully detailed search query which factors the user's task/request and finds the most relevant platform/package

          ---
          **CRITICAL EXCLUSION LIST**:
          Your final output MUST NOT include platforms/packages for:
          -   **Deployment Services** (e.g., AWS Lambda, Vercel).
          -   **Database Services** (e.g., Postgres, Redis, Supabase).
          -   **Generic Architectural Patterns** (e.g., Webhooks, HTTP Server, Cron Jobs, API Design).
          Acknowledge these in your thought process if necessary, but EXCLUDE them from the final JSON output.
          Do not duplicate platforms/packages. If a platform/package is already in the list, do not add it again.
          ---

          Now, begin your process for the following task.
        `,
        schema: z.array(
          z.object({
            platform: z
              .string()
              .describe(
                "The platform/package that is most likely to be used to accomplish the task/request"
              ),
            alternativePlatforms: z
              .array(z.string())
              .describe(
                "Array of probable platforms/packages related to user request "
              ),
            searchQuery: z
              .string()
              .describe(
                "A concise and fully detailed search query which factors the user's task/request and finds the most relevant platform/package. Do not include any other information in the search query."
              ),
          })
        ),
        prompt: `
          Name: ${taskInfo.name}
          Goal: ${taskInfo.goal}
          Summary: ${taskInfo.summary}
          ${modification ? `The user specifically mentioned: ${modification}` : ""}
        `,
      });
      const platforms1 = searchQueriesResult.object;
      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        originClientRequestId: ctx.request.originClientRequestId,
        model: models.googleGeminiPro.modelId,
        usage: searchQueriesResult.usage,
      });

      console.log("platforms1", platforms1);

      // Step 2: RAG search for each query
      ctx.response.writeMessageMetadata({
        loader: `Finding best packages...`,
      });

      const ragResults = [];
      const allFoundPackages: Record<
        string,
        PackageDbInfo & { functionalities: string[] }
      > = {};

      for (const platform of platforms1) {
        const rawSimilarPackages: PackageDbInfo[] = await findSimilarPackages(
          `Platform: ${platform.platform} - Search Query: ${platform.searchQuery}`,
          0.5,
          5
        );
        if (rawSimilarPackages && rawSimilarPackages.length > 0) {
          const similarPackages = rawSimilarPackages.map((pkg) => {
            const functionalities =
              pkg.status === PackageStatus.EXTERNAL
                ? [`all functionalities of ${pkg.package_name} package`]
                : pkg.constructors
                    ?.map((c: any) => c.functionalities)
                    .flat()
                    .filter(Boolean) || [];
            return { ...pkg, functionalities };
          });

          const bestMatch = similarPackages[0];
          const alternatives = similarPackages.slice(1);
          ragResults.push({
            searchQueryUsed: platform.searchQuery,
            bestMatch: bestMatch,
            alternatives: alternatives,
          });
          // Store all unique packages found
          for (const pkg of similarPackages) {
            if (
              !allFoundPackages[pkg.package_name] &&
              packageList.some((p) => p.package_name === pkg.package_name)
            ) {
              allFoundPackages[pkg.package_name] = pkg;
            }
          }
        }
      }
      //console.log("allFoundPackages", allFoundPackages);

      ctx.response.write({
        type: "text",
        text: dedent`
        Based on the requirements, the intitial search results and the available packages, the following packages are found:\n\n
        ${ragResults
          .map(
            (r) => `
          Platform: ${r.bestMatch?.package_title || "None"}\n
          Requirement: ${r.searchQueryUsed}\n
          Alternatives: ${r.alternatives.map((a) => a.package_title).join(", ") || "None"}\n\n
          ---
        `
          )
          .join("\n\n")}
        `,
      });

      // Step 3: AI analysis of RAG results
      ctx.response.writeMessageMetadata({
        loader: `Filtering for the best packages...`,
      });

      const packageResult = await generateObject({
        model: models.googleGeminiPro,
        system: `
          You are a lead software architect. Your primary goal is to act as the final decision-maker for selecting the correct software platforms/packages for a development task. You will be given the task summary, a list of search queries, and the results from a semantic platform/package search.

          ---
          **Process Flow:**
            -   You run in a loop of Thought, Action, PAUSE, Observation.
            -   At the end of the loop you output an Answer.
            -   Use Thought to describe your thoughts about the question you have been asked.
            -   Use Action to run one of the actions available to you - then return PAUSE.
            -   Observation will be the result of running those actions.
            -   At the end of the loop you output an Answer.
          ---

          **Steps:**
          1.  **Deconstruction (Thought)**:
              -   First, deeply understand the **TASK SUMMARY**.
              -   For this task, you will be given a list of search queries. Analyze the search queries and understand the underlying need.
              -   If there are multiple search queries which point to the same underlying need, consolidate them into a single, best-fit platform/package.

          2.  **Initial Platform Selection (Action)**:
              -   For each search query, compare all the resultant packages with their **AVAILABLE PACKAGE FUNCTIONALITIES** list to understand which package can *actually* do what is required for the task.
              -   If multiple packages have common functionalities required for the task, first select the one which covers maximum requirements and then choose the one with the highest status. (STABLE > SEMISTABLE > EXTERNAL)
              -   If there are no packages with the required functionalities, you MUST specify "@microfox/null" for that platform/package and provide a clear reason.

          3.  **Critical Evaluation & Self-Correction (Observation)**:
              -   For each query's final selection, ask yourself:
                  -   Is a suggested platform/package a generic tool when a more specialized internal platform/package exists?
                  -   If no suitable platform/package is found for a specific, necessary part of the task, you MUST specify "@microfox/null" for that platform/package and provide a clear reason.

          3.  **Final Selection (Output)**:
              -   Based on your analysis, construct the final, definitive list of platforms/packages required.
              -   Return your final answer in the specified JSON schema format.

          ---
          **CRITICAL EXCLUSION LIST**:
          Your final output MUST NOT include platforms/packages for:
          -   **Deployment Services** (e.g., AWS Lambda, Vercel).
          -   **Database Services** (e.g., Postgres, Redis, Supabase).
          -   **Generic Architectural Patterns** (e.g., Webhooks, HTTP Server, Cron Jobs, API Design).
          Acknowledge these in your thought process if necessary, but EXCLUDE them from the final JSON output.
          Do not duplicate platforms/packages. If a platform/package is already in the list, do not add it again.
          ---
        `,
        schema: taskIntegrations,
        prompt: `
        TASK SUMMARY: ${taskInfo.summary}
        ---
        SEARCH RESULTS:
        ${ragResults
          .map(
            (r) => `
          Query: "${r.searchQueryUsed}"
          Results: ${r.bestMatch?.package_name || ""}, ${r.alternatives.map((a) => a.package_name).join(", ") || ""}
        `
          )
          .join("\n")}
        ---
        AVAILABLE PACKAGE FUNCTIONALITIES:
        ${Object.values(allFoundPackages)
          .map(
            (pkg) =>
              `Package: ${pkg.package_name}\nStatus: ${pkg.status}\nFunctionalities it provides: ${pkg.functionalities.join(", ")}`
          )
          .join("\n")}
        `,
      });

      console.log("packageResult token Usage", packageResult.usage);
      let platforms = packageResult.object?.platforms;

      // Step 4. Process the results (same as old flow)
      platforms.forEach((platform) => {
        if (platform?.package === "@microfox/null") {
          slackBotSdk.sendMessage({
            channel: MySlackChannels.reports,
            text: dedent`
            Someone is trying to create a task
            & need ${platform?.name} integration in micro sdks 
            Task name: ${taskInfo.name}
            ----
            Reason for Platform: ${platforms.find((p) => p.name === platform?.name)?.reason}
            ---
            `,
          });
        }
      });

      console.log(
        "platforms",
        platforms.map((p) => p.name)
      );

      try {
        let finalPlatforms = platforms
          .map((p) => {
            if (p.package === undefined) return;
            let packageInfo = allFoundPackages[p.package];
            if (p.package === "@microfox/null") {
              return {
                ...p,
                package: p.package,
              };
            }
            return {
              ...p,
              name: packageInfo?.package_title || p.name,
              package: p.package,
            };
          })
          .filter((p) => p != undefined);

        platforms.forEach(async (platform) => {
          if (platform.package === undefined) return;
          let packageInfo = allFoundPackages[platform.package];
          console.log(
            "package Name",
            platform.package,
            "has added dependencies",
            packageInfo?.added_dependencies
          );
          if (
            packageInfo &&
            packageInfo.added_dependencies &&
            packageInfo.added_dependencies.length > 0
          ) {
            packageInfo.added_dependencies.forEach(
              async (dependency: string) => {
                if (!finalPlatforms.some((p) => p.package === dependency)) {
                  const packageInfo =
                    await PackageInfoHelper.getPackageInfo(dependency);
                  finalPlatforms.push({
                    name: dependency,
                    package: dependency,
                    reason: packageInfo?.description || "",
                    optional: true,
                    scopes: [],
                  });
                }
              }
            );
          }
        });

        console.log("addedPlatforms", finalPlatforms?.length);

        TokenUsageAnalyticsTracker.trackUsage({
          userId: ctx.request.userId,
          clientRequestId: ctx.request.clientRequestId,
          originClientRequestId: ctx.request.originClientRequestId,
          model: models.googleGeminiPro.modelId,
          usage: packageResult.usage,
        });

        ctx.response.writeMessageMetadata({
          loader: `Found ${finalPlatforms.length} platforms to integrate with`,
        });

        console.log("finalPlatforms", finalPlatforms.length);
        await updateTaskInstanceMeta({
          clientRequestId: ctx.request.clientRequestId,
          taskInstanceMeta: {
            ...taskInstanceMeta,
            taskIntegrations: {
              platforms: finalPlatforms,
            },
          },
        });

        ctx.response.writeCustomTool(
          uiTool.construct<"card">("convertfox", "task_integrations", {
            uiType: "card",
            text: modification
              ? "Finalise the integrations."
              : "Finalised the integrations.",
            object: {
              objectType: "task_integrations",
              object: {
                platforms: finalPlatforms,
              },
            },
            buttons: [
              {
                action: {
                  id: "appendMessage",
                  props: modification
                    ? "Finalise the integrations."
                    : "Finalised the integrations.",
                  actionText: "Confirm",
                },
                type: "confirm",
                text: "Confirm",
              },
            ],
          })
        );
      } catch (error) {
        console.log("error updating task instance meta", error);
      }

      ctx.response.writeMessageMetadata({
        convertfox_job: "task_integrations",
      });

      if (ctx.state.taskInstanceMeta) {
        ctx.state.taskInstanceMeta.taskIntegrations = packageResult.object;
      }

      return {
        taskIntegrations: packageResult.object,
      };
    },
  });
};
