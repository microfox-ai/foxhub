import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { PackageInfoHelper, findSimilarPackages, PackageDbInfo } from "@/utils/services/embeddings/packageSearch";
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
import { AiToolFactory } from "@repo/ai-utils/router";
import { uiTool } from "@/server/ui/uiTool";

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

      // Step 1: Generate search queries
      const searchQueriesResult = await generateObject({
        model: models.googleGeminiPro,
        system: `
          You are an expert software architect and a senior full-stack developer. Your primary goal is to deconstruct a user's task into a series of actionable, function-level search queries. These queries will be used to find specific code libraries and functions to accomplish the task.

          Follow this multi-step process:

          1.  **Deconstruction (Thought)**:
              -   Analyze the user's request (Name, Goal, Summary).
              -   Break down the goal into smaller, concrete programming steps or functions that would be needed.
              -   Consider the available internal packages. Can any of these packages fulfill the required steps?

          2.  **Initial Query Generation (Action)**:
              -   Based on your deconstruction, generate a list of precise search queries. Each query should target a specific function, library, or implementation pattern needed to solve one of the programming steps.

          3.  **Introspection and Refinement (Self-Correction)**:
              -   Critically review your generated queries. Ask yourself:
                  -   Is this query specific enough to yield a concrete function or library, not just a tutorial? (e.g., "npm library for parsing multipart/form-data" is better than "how to handle file uploads").
                  -   Does this query ask for something that should be handled by our internal infrastructure (like databases or deployment)? If so, discard it.
                  -   Is this query for a generic architectural pattern (like "webhook listener" or "REST API") that is not a searchable package? If so, discard it.
                  -   Is this query truly essential for the user's goal?

          4.  **Final Answer (Output)**:
              -   After refining your list, provide the final, high-quality, and meaningful search queries in the specified JSON format.

          ---
          **Exclusion Criteria for Final Queries:**
          Your final list of queries MUST NOT include searches for:
          -   Deployment services (e.g., AWS Lambda, Vercel). This is handled internally.
          -   Database services (e.g., Postgres, Redis, Supabase). This is handled internally.
          -   Generic, non-package patterns (e.g., "HTTP Server", "Webhook pattern", "REST API design", "API Validation & Throttling", "API Rate Limiting"). Focus on specific, searchable libraries or functions.
          -   Overly broad or tutorial-like questions (e.g., "how to build a chat app").
          -   Cron jobs (as it is not a package but a pattern of code)

          ---
          AVAILABLE INTERNAL PACKAGES:
          ${packageList.map((p) => p.package_name).join(", ")}
          ---

          Now, begin your process for the following task.
        `,
        schema: z.object({
          searchQueries: z.array(z.string()).describe("Array of actionable, package-level search queries mentioning the required functionality needed for the task."),
        }),
        prompt: `
          Name: ${taskInfo.name}
          Goal: ${taskInfo.goal}
          Summary: ${taskInfo.summary}
          ${modification ? `The user specifically mentioned: ${modification}` : ""}
        `,
      });
      const searchQueries = searchQueriesResult.object.searchQueries;
      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        originClientRequestId: ctx.request.originClientRequestId,
        model: models.googleGeminiPro.modelId,
        usage: searchQueriesResult.usage,
      });

      console.log("searchQueries", searchQueries);

      // Step 2: RAG search for each query
      ctx.response.writeMessageMetadata({
        loader: `Finding best packages for ${searchQueries.length} search queries...`,
      });

      const ragResults = [];
      const allFoundPackages: Record<string, PackageDbInfo & { functionalities: string[] }> = {};

      for (const query of searchQueries) {
        const rawSimilarPackages: PackageDbInfo[] = await findSimilarPackages(query, 0.5, 5);
        if (rawSimilarPackages && rawSimilarPackages.length > 0) {
          
          const similarPackages = rawSimilarPackages.map(pkg => {
            const functionalities = pkg.status === PackageStatus.EXTERNAL
                ? [`anything related to ${pkg.package_name}`]
                : pkg.constructors?.map((c: any) => c.functionalities).flat().filter(Boolean) || [];
            return { ...pkg, functionalities };
          });
          
          const bestMatch = similarPackages[0];
          const alternatives = similarPackages.slice(1);
          ragResults.push({
            searchQueryUsed: query,
            bestMatch: bestMatch,
            alternatives: alternatives,
          });
          // Store all unique packages found
          for (const pkg of similarPackages) {
            if (!allFoundPackages[pkg.package_name] && packageList.some(p => p.package_name === pkg.package_name)) {
              allFoundPackages[pkg.package_name] = pkg;
            }
          }
        }
      }
      console.log("allFoundPackages", allFoundPackages);

      // Step 3: AI analysis of RAG results
      ctx.response.writeMessageMetadata({
        loader: `Analysing ${Object.keys(allFoundPackages).length} potential packages...`,
      });
      
      const packageResult = await generateObject({
        model: models.googleGeminiPro,
        system: `
          You are a lead software architect. Your primary goal is to act as the final decision-maker for selecting the correct software packages for a development task. You will be given the task summary, a list of search queries, and the results from a semantic package search.

          Follow this rigorous analysis process:

          1.  **Holistic Review (Thought)**:
              -   First, deeply understand the **TASK SUMMARY**.
              -   Then, for each **SEARCH QUERY** and its results, analyze the \`bestMatch\` and \`alternatives\`.
              -   Cross-reference these packages with the **AVAILABLE PACKAGE FUNCTIONALITIES** list to understand what each package can *actually* do. Note the \`status\` of each package.

          2.  **Critical Evaluation & Self-Correction**:
              -   When evaluating packages, prioritize them in this order: **STABLE > SEMISTABLE > EXTERNAL**. Only choose a lower-status package if it provides critical functionality that a higher-status one lacks.
              -   For each query's results, ask yourself:
                  -   Is the \`bestMatch\` truly the best fit, or does an \`alternative\` offer better functionality for this specific task?
                  -   Do multiple search queries point to the same underlying need? If so, consolidate them into a single, best-fit package. Do not include redundant packages.
                  -   Is a suggested package a generic tool when a more specialized internal package exists?
                  -   If no suitable package is found for a specific, necessary part of the task, you MUST specify "@microfox/null" for that platform and provide a clear reason.

          3.  **Final Selection (Action & Output)**:
              -   Based on your analysis, construct the final, definitive list of platforms required.
              -   Return your final answer in the specified JSON schema format.

          ---
          **CRITICAL EXCLUSION LIST**:
          Your final output MUST NOT include platforms for:
          -   **Deployment Services** (e.g., AWS Lambda, Vercel).
          -   **Database Services** (e.g., Postgres, Redis, Supabase).
          -   **Generic Architectural Patterns** (e.g., Webhooks, HTTP Server, Cron Jobs).
          Acknowledge these in your thought process if necessary, but EXCLUDE them from the final JSON output.
          Do not duplicate packages. If a package is already in the list, do not add it again.
          ---
        `,
        schema: taskIntegrations,
        prompt: `
        TASK SUMMARY: ${taskInfo.summary}
        ---
        SEARCH RESULTS:
        ${ragResults.map(r => `
          Query: "${r.searchQueryUsed}"
          Best Match: ${r.bestMatch?.package_name || 'None'}
          Alternatives: ${r.alternatives.map(a => a.package_name).join(", ") || 'None'}
        `).join('\n')}
        ---
        AVAILABLE PACKAGE FUNCTIONALITIES:
        ${Object.values(allFoundPackages).map((pkg) => `Package: ${pkg.package_name}\nStatus: ${pkg.status}\nFunctionalities: ${pkg.functionalities.join(", ")}`).join("\n")}
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
        platforms.map((p) => p.name + "-" + p.package)
      );

      try {
        let finalPlatforms = platforms.filter(
          (platform) => platform.package != undefined
        );

        platforms.forEach(async (platform) => {
          if (platform.package === undefined) return;
          let packageInfo = allFoundPackages[platform.package];
          console.log("package Name", platform.package, "has added dependencies", packageInfo?.added_dependencies);
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
