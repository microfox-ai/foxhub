import { findLastElementWith } from "@/utils/helpers/array";
import {
  defaultCallbackResultBody,
  defaultRequestBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { generateObject } from "ai";
import { z } from "zod";
import { models } from "../models";
import { convertfoxRouter } from "../convertfox/_convertFoxRouter";
import { hellofoxRouter } from "../hellofox/_hellofoxRouter";
import { deployFoxRouter } from "../deployfox/_deployfoxRouter";
import { buildFoxRouter } from "../buildfox/_buildFoxRouter";
import {
  MinionFlow,
  MinionSupports,
  MinionType,
  MinionTypeType,
} from "@/components/screens/hooks/convertors";
import { hotfixFoxRouter } from "../hotfixfox/_hotfixRouter";
import { publishFoxRouter } from "../publishfox/_publishFoxRouter";
import { installFoxRouter } from "../installfox/_installFoxRouter";
import { taskQueryRouter } from "../taskqueryfox/_taskQueryRouter";

const getMinionRouter = (minionType: MinionTypeType, props: any) => {
  switch (minionType) {
    case MinionType.HelloFox:
      return hellofoxRouter(props);
    case MinionType.ConvertFox:
      return convertfoxRouter(props);
    case MinionType.BuildFox:
      return buildFoxRouter(props);
    case MinionType.DeployFox:
      return deployFoxRouter(props);
    case MinionType.HotFixFox:
      return hotfixFoxRouter(props);
    case MinionType.PublishFox:
      return publishFoxRouter(props);
    case MinionType.InstallFox:
      return installFoxRouter(props);
    case MinionType.TaskQueryFox:
      return taskQueryRouter(props);
    default:
      props.dataStream.writeMessageAnnotation({
        type: "error",
        content: "Unknown minion type",
      });
      return {
        responseBody: { ...props.responseBody },
        appendRequestBody: { ...props.requestBody },
      };
  }
};
// hellofox, convertfox, buildfox, deployfox, testfox.
export const buildFlow: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  if (!requestBody.messages)
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };

  const lastUsersMessage = findLastElementWith(
    requestBody.messages as any[],
    (message) => message.role === "user"
  );
  const lastAssistantMessage = findLastElementWith(
    requestBody.messages as any[],
    (message) => message.role === "assistant"
  );
  if (!lastUsersMessage)
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };

  if (requestBody.minionContinue) {
    return getMinionRouter(requestBody.minionType, props);
  }

  props.dataStream.writeMessageAnnotation({
    type: "minionFlow",
    value: MinionFlow.BuildFlow,
  });

  // clientRequestId is sent back in analytics
  // props.dataStream.writeMessageAnnotation({
  //   type: "clientRequestId",
  //   value: requestBody.clientRequestId,
  // });

  const lastUsersMessageContent = lastUsersMessage.content;
  let minionType: MinionTypeType = requestBody.minionType;

  if (minionType === MinionType.Unknown && requestBody.messages.length <= 1) {
    minionType = MinionType.HelloFox;
  }
  const isMinionFirsttime =
    requestBody.messages.filter(
      (m: any) =>
        m.role === "assistant" &&
        m.annotations?.find((a: any) => a.type === "minion")?.value ===
          minionType
    ).length < 1;

  const isSameMinionJustBefore =
    lastAssistantMessage?.annotations?.find((a: any) => a.type === "minion")
      ?.value === minionType;

  const isMinionSupportsIntentReading =
    MinionSupports[minionType]?.includes("intent-observor"); // convertfox, hellofox

  let needIntentObserver = false;
  // do i have to observe the last message to route to the correct minion?

  if (minionType === MinionType.Unknown) {
    needIntentObserver = true;
  }
  if (
    !isMinionFirsttime &&
    !isMinionSupportsIntentReading &&
    isSameMinionJustBefore
  ) {
    // if minion has already talked, and the poor minion does not know inside it, and it also has just responded, then lets do intent based classification here.
    needIntentObserver = true;
  }

  console.log(
    "needIntentObserver",
    minionType,
    needIntentObserver,
    isMinionFirsttime,
    isMinionSupportsIntentReading,
    isSameMinionJustBefore
  );

  if (needIntentObserver) {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Thinking about the user's intent",
    });

    const result = await generateObject({
      model: models.googleGeminiPro,
      schema: z.object({
        intent: z.enum([
          "Modify-Task",
          "Add-Features",
          "Rebuild-App",
          "Redeploy-App",
          "Casual-Chat",
          "Publish-App-to-Store",
          "In-Task-Query",
        ]),
        reason: z.string(),
      }),
      system: `
            We are building an automation for the user.
            In the middle of the conversation, user has sent the following message,
            we need to detect the exact intent of the user to understand what they want to do.

            CRITICAL:
            If the user is asking for even a tiny change/modification of the built automation, then always pass the intent as "Modify-Task"
            If the user is asking for a new feature, then pass the intent as "Add-Features"
            if the user is asking something related to the curren task, then pass the intent as "In-Task-Query"
        `,
      prompt: `
            The user has sent the following message:
            ${lastUsersMessageContent}
        `,
    });

    console.log("result", result.object.intent);

    switch (result.object.intent) {
      case "Modify-Task":
        return convertfoxRouter(props);
      case "Add-Features":
        return hellofoxRouter(props);
      case "Casual-Chat":
        return hellofoxRouter(props);
      case "Rebuild-App":
        return buildFoxRouter(props);
      case "Redeploy-App":
        return deployFoxRouter(props);
      case "Publish-App-to-Store":
        return publishFoxRouter(props);
      case "In-Task-Query":
        return taskQueryRouter(props);
      default:
        props.dataStream.writeMessageAnnotation({
          type: "error",
          content: "Unknown minion type",
        });
        return {
          responseBody: { ...responseBody },
          appendRequestBody: { ...requestBody },
        };
    }
  } else {
    return getMinionRouter(minionType, props);
  }
};
