import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { models } from "../models";
import { getPackageList } from "./getInternalPackages";
import { fetchPackageInfo } from "./gitFetchers";
import { TaskInstanceMetaType, taskIntegrations } from "./types";
import { MySlackChannels, slackBotSdk } from "@/utils/services/slackBotSdk";
import { IN_DEV, IN_STAGING } from "@/utils/constants/appInfo";

// IMPORTANT TODO: create another multi-agent workflow to figure out the platform, package, auth method, etc. (check types.ts for more details)
// THIS OPERATION IS USELESSY CALLING AI TOO MANY TIMES BECAUSE OF IMPORPER EMBEDDING USAGE.
export const createTaskIntegrations = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  modification?: string
) => {
  const { dataStream, requestBody, responseBody } = props;

  const taskInfo = taskInstanceMeta.taskInfo;

  if (!taskInfo) {
    throw new Error("Task info not found");
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Searching for platforms we need to integrate with",
  });

  // serach internal packages for each platform & attach them to the platform
  const packageList = await getPackageList();
  const stablePackageNames = packageList.stablePackages;
  const semiStablePackageNames = packageList.semiStablePackages;
  const externalPackageNames = packageList.externalPackages;
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
        ${stablePackageNames.join(", ")}
        ${semiStablePackageNames.join(", ")}
        ${externalPackageNames.join(", ")}
        ---
        Exclude the following platforms from the list:
        - Any Deployment service (as it is in-house supported by us for hosting user's servcie) - Ex: AWS Lambda, Azure Functions, etc.
        - Any Database (as it is in-house supported by us for hosting user's servcie) - Ex: Postgres, MySQL, etc.
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
        ...props.requestBody,
        model: models.googleGeminiPro.modelId,
        usage: result.usage,
      });
    },
    onError: (error) => {
      console.log("platform identification error", error);
    },
  });

  textPlatformsStream.mergeIntoDataStream(dataStream, {
    experimental_sendFinish: false,
  });

  const textOfPlatforms = await textPlatformsStream.text;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: `searching for related packages...`,
  });

  // Filter down all packages from both stablePackageNames and externalPackageNames
  // that have any remote relation to the platforms in textOfPlatforms
  const filteredPackagesResult = await generateObject({
    model: models.googleGeminiPro,
    system: `
    You are an expert fullstack developer.
    You are given a list of platforms and two lists of packages (internal and external).
    Your task is to identify ALL packages from both lists that have ANY remote relation to the platforms.
    This means:
    1. Include packages that directly integrate with any of the platforms
    2. Include packages that have any functional overlap with the platforms
    3. Include packages that could be used in conjunction with the platforms
    
    Be thorough and include packages even if they have only a tangential relationship.
    If a package appears in both lists, include it in both output arrays.
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
    internal packages: ${stablePackageNames.join(", ")}${IN_STAGING ? `${semiStablePackageNames.join(", ")}` : ""}
    external packages: ${externalPackageNames.join(", ")}
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

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Fetching functionalities for  ${filteredInternalPackages.length} packages`,
  });

  // Fetch package information for internal packages
  const internalPackagesWithInfo = await Promise.all(
    filteredInternalPackages.map(async (packageName) => {
      const packageInfo = await fetchPackageInfo(packageName);
      // console.log(
      //   "packageInfo for ",
      //   packageName,
      //   packageInfo?.readme_map?.functionalities
      // );
      return {
        name: packageName,
        functionalities: packageInfo?.readme_map?.functionalities || [],
        packageInfo: packageInfo || null,
      };
    })
  );

  // Filter out packages with null packageInfo
  const validInternalPackagesWithInfo = internalPackagesWithInfo.filter(
    (pkg) => pkg.packageInfo !== null
  );

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Analysing ${validInternalPackagesWithInfo.length} internal & ${filteredExternalPackages.length} external packages`,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.googleGeminiPro.modelId,
    usage: filteredPackagesResult.usage,
  });

  console.log("validInternalPackagesWithInfo", filteredInternalPackages);
  console.log("filteredExternalPackages", filteredExternalPackages);
  console.log("textOfPlatforms", textOfPlatforms);

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
        text: `
        Someone is trying to create a task
        & need ${platform?.name} integration in micro sdks 
        Task name: ${taskInfo.name}
        ----
        Platform Info: ${JSON.stringify(platforms)}
        ---
        `,
      });
    }
  });

  console.log(
    "platforms",
    platforms.map((p) => p.name + "-" + p.package)
  );

  let addedPlatforms: {
    name: string;
    package: string;
    reason: string;
    optional: boolean;
    scopes: string[];
  }[] = [];
  let finalPlatforms = await Promise.all(
    platforms
      .filter((platform) => platform.package != undefined)
      .map(async (platform) => {
        let packageInfo = validInternalPackagesWithInfo.find(
          (pkg) => pkg.name === platform.package
        )?.packageInfo;
        if (!packageInfo) {
          packageInfo = await fetchPackageInfo(platform.package as string);
        }
        if (
          packageInfo.addedDependencies &&
          packageInfo.addedDependencies.length > 0
        ) {
          packageInfo.addedDependencies.forEach((dependency: string) => {
            if (!addedPlatforms.some((p) => p.package === dependency)) {
              addedPlatforms.push({
                name: dependency,
                package: dependency,
                reason: `This platform is added as it is a dependency of ${platform.name}`,
                optional: true,
                scopes: [],
              });
            }
          });
        }
        return { ...platform, ...(packageInfo ? { packageInfo } : {}) };
      })
  );

  finalPlatforms = finalPlatforms.filter(
    (platform) => (platform as any).packageInfo !== null
  );

  addedPlatforms.forEach(async (platform) => {
    const packageInfo = await fetchPackageInfo(platform.package);
    finalPlatforms.push({
      name: platform.name,
      reason: platform.reason,
      optional: platform.optional,
      scopes: [],
      package: platform.package,
      packageInfo: packageInfo,
    });
  });

  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.googleGeminiPro.modelId,
    usage: packageResult.usage,
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Found ${finalPlatforms.length} platforms to integrate with`,
  });

  await updateTaskInstanceMeta({
    clientRequestId: requestBody.clientRequestId,
    taskInstanceMeta: {
      ...taskInstanceMeta,
      taskIntegrations: {
        platforms: finalPlatforms,
      },
    },
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskIntegrations",
    object: {
      platforms: finalPlatforms,
    },
    persona: "taskManager",
    text: modification
      ? `Finalise the integrations.`
      : `Finalised the integrations.`,
    buttons: [
      {
        action: "highlightInput",
        text: "Not Yet",
        type: "deny",
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "appendMessage",
        text: "Confirm",
        type: "confirm",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "Yes, Everything looks good to me.",
        minionType: "convertfox",
      },
    ],
  });

  return packageResult.object;
};
