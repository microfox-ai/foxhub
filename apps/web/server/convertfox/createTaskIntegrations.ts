import { generateObject, streamObject, streamText, tool } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { models } from "../models";
import { TaskInfo, taskIntegrations, TaskInstanceMetaType } from "./types";
import { object, z } from "zod";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { getPackageList, getOnlyPackageNames } from "./getInternalPackages";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { fetchGithubJson, fetchPackageInfo } from "./gitFetchers";

// IMPORTANT TODO: create another multi-agent workflow to figure out the platform, package, auth method, etc. (check types.ts for more details)
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

  // first, get a text of all the platforms we need to integrate with for this task
  const textPlatformsStream = streamText({
    model: models.googleGeminiPro,
    system: `
        You analyse the task information & find the platforms we need to integrate with.
        You return all the third party platforms we need to integrate with (along with specific needs for each platform).
        You also return if there are alternatives for third party platforms.
        platforms can be of different types - social media, payment, email, or tools like excel, google sheets, etc.
        In house
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
        ___
        Answer format:
        platforms:
        - name: <a specificplatform name>
          reason: <reason for integrating with this specific platform>
          type: <type of platform>
          alternatives: <alternative platforms for this platform>
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
  // serach internal packages for each platform & attach them to the platform
  const packageList = await getPackageList();
  const stablePackageNames = packageList.stablePackages;
  const externalPackageNames = packageList.semiStablePackages;

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
    2. Include packages that could be used as alternatives for any of the platforms
    3. Include packages that have any functional overlap with the platforms
    4. Include packages that could be used in conjunction with the platforms
    
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
    internal packages: ${stablePackageNames}
    external packages: ${externalPackageNames}
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

  // TODO: pick all packages as relatedPackages, not just one, & then select at a second step.
  const packageResult = await generateObject({
    model: models.googleGeminiPro,
    system: `
    You are an expert fullstack developer.
    You are given a list of platforms & thier alternative.
    Search for existing internal packages that can be used to integrate with the platforms.
    If internal package does not have the required functionalities for the task, search for external packages.
    If no internal package is found, search for external packages.
    package - If you find any, attach the package name.
    package - If you dont find any even in alternatives, attach @microfox/null.
    Ignore all conditional platforms.
    ---
    Exclude the following platforms from the list:
    - Website Webhooks (as we provide documentation fr this, & user can just copy paste the code)
    - Any Deployment service (as it is in-house supported by us for hosting user's servcie) - Ex: AWS Lambda, Azure Functions, etc.
    - Any Database (as it is in-house supported by us for hosting user's servcie) - Ex: Postgres, MySQL, Redis etc.`,
    schema: taskIntegrations,
    prompt: `
    ----
    task summary: ${taskInfo.summary}
    platforms: ${textOfPlatforms}
    ----
    internal packages: ${validInternalPackagesWithInfo.map((pkg) => `Name: ${pkg.name}\nFunctionalities: ${pkg.functionalities.join(", ")}`).join("\n")}
    external packages: ${filteredExternalPackages}
    `,
  });
  console.log("packageResult token Usage", packageResult.usage);
  let platforms = packageResult.object?.platforms;
  let alternativePlatforms = packageResult.object?.alternativePlatforms;
  let finalPlatforms = platforms.map((platform) => {
    if (platform?.package === "@microfox/null") {
      let findAlternative = alternativePlatforms?.find(
        (alternative) =>
          alternative?.alternativeFor === platform?.name &&
          alternative?.package !== "@microfox/null"
      );
      if (findAlternative) {
        alternativePlatforms = alternativePlatforms?.filter(
          (alternative) => alternative?.name !== findAlternative?.name
        );
        alternativePlatforms?.push({
          alternativeFor: findAlternative.name,
          name: platform.name,
          reason: platform.reason,
          package: platform.package,
        });
        return findAlternative;
      }
    }
    return platform;
  });

  finalPlatforms = await Promise.all(
    platforms.map(async (platform) => {
      const packageInfo = await fetchPackageInfo(
        platform?.package ?? "@microfox/null"
      );
      console.log("packageInfo for ", platform.package, packageInfo);
      return { ...platform, ...(packageInfo ? { packageInfo } : {}) };
    })
  );

  finalPlatforms = finalPlatforms.filter(
    (platform) => (platform as any).packageInfo !== null
  );

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
        alternativePlatforms: alternativePlatforms,
      },
    },
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskIntegrations",
    object: {
      platforms: finalPlatforms,
      alternativePlatforms: alternativePlatforms,
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
