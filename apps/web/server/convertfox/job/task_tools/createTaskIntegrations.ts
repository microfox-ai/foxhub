import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
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
      // first, get a text of all the platforms we need to integrate with for this task
      const textPlatformsStream = streamText({
        model: models.googleGeminiPro,
        system: `
            You analyse the task information & find the platforms & internal packages we need to integrate with.
            You return all the third party platforms we need to integrate with (along with specific needs for each platform).
            You als return all the internal packages we need to integrate with (along with specific needs for each package).
            ---
            You run in a loop of Thought, Action, PAUSE, Observation.
            At the end of the loop you output an Answer
            Use Thought to describe your thoughts about the question you have been asked.
            Use Action to run one of the actions available to you - then return PAUSE.
            Observation will be the result of running those actions.
            At the end of the loop you output an Answer
            ___
            Answer format:
            packages:
            - name: <a specific platform/internal package name>
              reason: <reason for integrating with this specific platform/internal package>
              type: <type of platform/internal package>
              alternatives: <alternative platforms/internal packages for this platform/internal package>
            ----
            IN BUILT PACKAGES SUPPORT:
            ${packageList.map((pkg, idx) => `${idx + 1}. ${pkg.package_name}`).join(", ")}
            ---
            Exclude the following platforms from the list:
            - Any Deployment service (as it is in-house supported by us for hosting user's servcie) - Ex: AWS Lambda, Azure Functions, etc.
            - Any Database (as it is in-house supported by us for hosting user's servcie) - Ex: Postgres, MySQL, etc.
            - Avoid meaningless platforms like "Webhooks", "HTTP Server" etc.
            ---
        `,
        prompt: `
Name: ${taskInfo.name}
Goal: ${taskInfo.goal}
Summary: ${taskInfo.summary}
${modification ? `The user specifically mentioned: ${modification}` : ""}
        `,
        onFinish: (result) => {
          console.log("platform identification token Usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            userId: ctx.request.userId,
            clientRequestId: ctx.request.clientRequestId,
            originClientRequestId: ctx.request.originClientRequestId,
            model: models.googleGeminiPro.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("platform identification error", error);
        },
      });

      ctx.response.merge(textPlatformsStream.toUIMessageStream());

      const textOfPlatforms = await textPlatformsStream.text;

      ctx.response.writeMessageMetadata({
        loader: `searching for related packages...`,
      });

      // Filter down all packages from both stablePackageNames and externalPackageNames
      // that have any remote relation to the platforms in textOfPlatforms
      const filteredPackagesResult = await generateObject({
        model: models.googleGeminiPro,
        system: `
        You are an expert fullstack developer.
        Your job is to clasify the platforms, and select internalPackages & externalPackages that are related to the platforms.
        You will be given a list of supported internal packages & external packages.
        You are given a list of platforms and two lists of packages (internal and external).
        Your task is to identify ALL packages from both lists that have ANY remote relation to the platforms.
        This means:
        1. Include packages that directly integrate with any of the platforms
        2. Include packages that have any functional overlap with the platforms
        3. Include packages that could be used in conjunction with the platforms
        
        Be thorough and include packages even if they have only a tangential relationship.
        If a package appears in both lists, include it in both output arrays.

        Priority:
        - STABLE > SEMISTABLE > EXTERNAL
        Unless the stable or unstable packages dont have the related functionality, then include the external packages.
        `,
        schema: z.object({
          internalPackages: z
            .array(z.string())
            .describe("Internal packages related to the platforms"),
          externalPackages: z
            .array(z.string())
            .describe("External packages related to the platforms"),
        }),
        prompt: `
        platforms: ${textOfPlatforms}
        internal packages: ${packageList
          .filter(
            (pkg) =>
              pkg.status === PackageStatus.STABLE ||
              pkg.status === PackageStatus.SEMISTABLE
          )
          .map(
            (pkg) =>
              `${pkg.package_name} - ${pkg.status} - ${pkg.readme_map?.functionalities.join(", ")}`
          )
          .join(", ")}
        external packages: ${packageList
          .filter((pkg) => pkg.status === PackageStatus.EXTERNAL)
          .map(
            (pkg) =>
              `${pkg.package_name} - ${pkg.status} - ${pkg.readme_map?.functionalities.join(", ")}`
          )
          .join(", ")}
        `,
      });

      console.log(
        "filteredPackagesResult token Usage",
        filteredPackagesResult.usage
      );
      const filteredInternalPackages =
        filteredPackagesResult.object?.internalPackages || [];
      const filteredExternalPackages =
        filteredPackagesResult.object?.externalPackages || [];

      ctx.response.writeMessageMetadata({
        loader: `Fetching functionalities for  ${filteredInternalPackages.length} packages`,
      });

      // Fetch package information for internal packages
      const validInternalPackagesWithInfo = (
        await PackageInfoHelper.getPackageInfos(filteredInternalPackages)
      )
        .map((pkg) => ({
          name: pkg.name,
          functionalities: pkg.readme_map?.functionalities || [],
          packageInfo: pkg,
        }))
        .filter((pkg) => pkg.packageInfo !== null);

      ctx.response.writeMessageMetadata({
        loader: `Analysing ${validInternalPackagesWithInfo.length} internal & ${filteredExternalPackages.length} external packages`,
      });

      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        originClientRequestId: ctx.request.originClientRequestId,
        model: models.googleGeminiPro.modelId,
        usage: filteredPackagesResult.usage,
      });

      // TODO: pick all packages as relatedPackages, not just one, & then select at a second step.
      const packageResult = await generateObject({
        model: models.googleGeminiPro,
        system: `
        You are an expert fullstack developer.
        You are given a list of platforms .
        Search for existing internal packages & external packages that we support can be used to integrate with each platforms.
        If no related package is found, 
        use @microfox/null.
        Ignore all conditional platforms.
        ---
        Exclude the following platforms from the list:
        - Webhooks (as it is not a package but a pattern of code)
        - Any Deployment service (as it is in-house supported by us for hosting user's servcie) - Ex: AWS Lambda, Azure Functions, etc.
        - Any Database (as it is in-house supported by us for hosting user's servcie) - Ex: Postgres, MySQL, Redis etc.`,
        schema: taskIntegrations,
        prompt: `
        ----
        task summary: ${taskInfo.summary}
        platforms: ${textOfPlatforms}
        ----
        platform we support:
        internal packages: ${validInternalPackagesWithInfo.map((pkg) => `Name: ${pkg.name}\nDescription: ${pkg.packageInfo?.description}\nFunctionalities: ${pkg.functionalities.join(", ")}`).join("\n")}
        external packages: ${filteredExternalPackages}
        `,
      });
      console.log("packageResult token Usage", packageResult.usage);
      let platforms = packageResult.object?.platforms;
      // let alternativePlatforms = packageResult.object?.alternativePlatforms;
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

      // Step 4. ADD he addedDepencies also into platforms list.
      try {
        let finalPlatforms = platforms.filter(
          (platform) => platform.package != undefined
        );

        platforms.forEach(async (platform) => {
          if (platform.package === undefined) return;
          let packageInfo = validInternalPackagesWithInfo.find(
            (pkg) => pkg.name === platform.package
          )?.packageInfo;
          if (
            packageInfo &&
            packageInfo.addedDependencies &&
            packageInfo.addedDependencies.length > 0
          ) {
            packageInfo.addedDependencies.forEach(
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
