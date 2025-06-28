import { findLastElementWith } from "@/utils/helpers/array";
import { generateObject } from "ai";
import { z } from "zod";
import { models } from "../models";
import {
  MinionFlow,
  MinionSupports,
  MinionType,
  MinionTypeType,
} from "@/components/screens/hooks/convertors";
import { prisma } from "@/prisma/prisma";
import { TaskStructure } from "../convertfox/helpers/types";
import { AiAgentKit, AiHandler, AiMiddleware } from "@repo/ai-utils/router";
import helloFoxAgent from "../hellofox/hellofox.agent";
import convertfoxAgent from "../convertfox/_router";
import deployfoxAgent from "../deployfox/deployfoxAgent";
import { findLastMessageWith, getTextParts } from "@repo/ai-utils/helper";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { buildFoxAgent } from "../buildfox/_buildFoxRouter";
import { hotfixFoxAgent } from "../hotfixfox/_hotfixRouter";
import { publishFoxAgent } from "../publishfox/_publishFoxRouter";
import { installFoxAgent } from "../installfox/_installFoxRouter";
import { taskQueryAgent } from "../taskqueryfox/_taskQueryRouter";

// hellofox, convertfox, buildfox, deployfox, testfox.
const buildManager = new AiAgentKit<any, any, any, any>();

buildManager.use("/", async (ctx, next) => {
  const { request, state, response } = ctx;
  if (request.minionContinue) {
    return;
  }
  //console.log("/buildFlow use", request, state, response);
  response.writeMessageMetadata({
    minionFlow: MinionFlow.BuildFlow,
  });
  return next();
});

buildManager.agent<DefaultMessageMetadata, any, any>("/", async (ctx) => {
  const { request, state, response, next } = ctx;

  console.log("/buildflow agent", state);

  if (!request.messages) return;
  const lastAssistantMessage = findLastMessageWith(request.messages, {
    role: "assistant",
  });
  let minionType: MinionTypeType = request.minionType;

  if (minionType === MinionType.Unknown && request.messages.length <= 1) {
    minionType = MinionType.HelloFox;
  }

  const isMinionFirsttime =
    findLastMessageWith(request.messages, {
      metadata: {
        minionType,
      },
    }) === null;

  const isSameMinionJustBefore =
    (lastAssistantMessage?.metadata as any)?.minionType === minionType;

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
    await next.callAgent("/decideIntent", { type: "direct_call" });
  } else {
    switch (minionType) {
      case MinionType.HelloFox:
        await next.callAgent("/hellofox", { type: "direct_call" });
        console.log("buildFlow exiting", state);
        return;
      case MinionType.ConvertFox:
        await next.callAgent("/convertfox", { type: "direct_call" });
        return;
      case MinionType.BuildFox:
        await next.callAgent("/buildfox", { type: "direct_call" });
        return;
      case MinionType.DeployFox:
        await next.callAgent("/deployfox", { type: "direct_call" });
        return;
      case MinionType.HotFixFox:
        await next.callAgent("/hotfixfox", { type: "direct_call" });
        return;
      case MinionType.PublishFox:
        await next.callAgent("/publishfox", { type: "direct_call" });
        return;
      case MinionType.InstallFox:
        await next.callAgent("/installfox", { type: "direct_call" });
        return;
      case MinionType.TaskQueryFox:
        await next.callAgent("/taskqueryfox", {
          type: "direct_call",
        });
        return;
      default:
        response.writeMessageMetadata({
          error: "Unknown minion type",
        });
        return;
    }
  }
});

buildManager.agent("/decideIntent", async (ctx) => {
  const { request, response, next } = ctx;
  if (!request.messages) return;

  const lastUsersMessage = findLastMessageWith(request.messages, {
    role: "user",
  });
  const lastUsersMessageContent = getTextParts(lastUsersMessage).join("");

  response.writeMessageMetadata({
    loader: "Thinking about the user's intent",
  });

  const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
    where: {
      originClientRequestId: request.clientRequestId,
    },
  });

  const result = await generateObject({
    model: models.googleGeminiPro,
    schema: z.object({
      intent: z.enum([
        "Modify-App",
        "Add-Features",
        "Rebuild-App",
        "Redeploy-App",
        "Deploy-App-to-Production",
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

            Task Tool Calls available:
            ${(taskInstanceMeta?.taskStructure as any as TaskStructure)?.lambdaFunctions?.map((toolCall) => toolCall.name).join(", ")}

            CRITICAL:
            If the user is asking for a change/modification of the built task/automation/app, then always pass the intent as "Modify-App"
            if the user is asking something related to the current task or looking to trigger something inside the task like the task tool calls, then pass the intent as "In-Task-Query"
            If the user is asking for a new feature, then pass the intent as "Add-Features"
            If the user is asking to rebuild the task, then pass the intent as "Rebuild-App"
            If the user is asking to redeploy the task, then pass the intent as "Redeploy-App"
            If the user is asking to publish the task, then pass the intent as "Publish-App-to-Store"
            if nothing else matches, fallback to "In-Task-Query" or "Casual-Chat"
        `,
    prompt: `
            The user has sent the following message:
            ${lastUsersMessageContent}
        `,
  });

  console.log("result", result.object.intent);

  switch (result.object.intent) {
    case "Modify-App":
      await next.callAgent("@/buildFlow/convertfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Add-Features":
      await next.callAgent("@/buildFlow/hellofox/task-query", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Casual-Chat":
      await next.callAgent("@/buildFlow/hellofox/casual", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Rebuild-App":
      await next.callAgent("@/buildFlow/buildfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Redeploy-App":
      await next.callAgent("@/buildFlow/deployfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Publish-App-to-Store":
      await next.callAgent("@/buildFlow/publishfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "In-Task-Query":
      await next.callAgent("@/buildFlow/taskqueryfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    case "Deploy-App-to-Production":
      await next.callAgent("@/buildFlow/deployfox", {
        type: "ai_call",
        redirectIntent: result.object,
      });
      return;
    default:
      response.writeMessageMetadata({
        error: "Unknown intent observed. Please try again.",
      });
      return;
  }
});

buildManager.agent("/hellofox", helloFoxAgent);
buildManager.agent("/convertfox", convertfoxAgent);
buildManager.agent("/deployfox", deployfoxAgent);
buildManager.agent("/buildfox", buildFoxAgent);
buildManager.agent("/hotfixfox", hotfixFoxAgent);
buildManager.agent("/installfox", installFoxAgent);
buildManager.agent("/publishfox", publishFoxAgent);
buildManager.agent("/taskqueryfox", taskQueryAgent);

export { buildManager };
