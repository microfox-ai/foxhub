import { generateObject, streamObject, streamText, tool } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { models } from "../models";
import { TaskInfo, taskIntegrations, TaskInstanceMetaType } from "./types";
import { object, z } from "zod";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  getInternalPackages,
  getOnlyPackageNames,
} from "./getInternalPackages";
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
    contents: "I am searching for platforms we need to integrate with",
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
    contents: `searching for packages...`,
  });
  // serach internal packages for each platform & attach them to the platform
  const internalPackages = await getInternalPackages();
  const onlyPackageNames = await getOnlyPackageNames(internalPackages);
  const packageResult = await generateObject({
    model: models.googleGeminiPro,
    system: `
    You are an expert fullstack developer.
    You are given a list of platforms & thier alternative.
    Search for existing internal packages that can be used to integrate with the platforms.
    package - If you find any, attach the package name.
    package - If you dont find any even in alternatives, attach @microfox/null.
    Ignore all conditional platforms.
    ____
    You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
         ---
        Exclude the following platforms from the list:
        - Any Deployment service (as it is in-house supported by us for hosting user's servcie) - Ex: AWS Lambda, Azure Functions, etc.
        - Any Database (as it is in-house supported by us for hosting user's servcie) - Ex: Postgres, MySQL, etc.
    `,
    schema: taskIntegrations,
    prompt: `
    platforms: ${textOfPlatforms}
    internal packages: ${onlyPackageNames}
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
      if (
        platform?.package?.startsWith("@microfox/") &&
        platform?.package !== "@microfox/null"
      ) {
        const packageInfo = await fetchPackageInfo(platform?.package);
        return { ...platform, packageInfo };
      }
      return platform;
    })
  );

  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.googleGeminiPro.modelId,
    usage: packageResult.usage,
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
      },
    ],
  });

  return packageResult.object;
};
