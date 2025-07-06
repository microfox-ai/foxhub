import { prisma } from "@/prisma/prisma";
import { createPullRequest } from "@/server/buildfox/createPullRequest";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { findLastElementWith } from "@/utils/helpers/array";
import { addGithubSecretsToRepo } from "@/utils/services/db_functions/createNewBotProject";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { convertToModelMessages, generateObject, streamText } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCharacter } from "../hellofox/_prompts";
import { models } from "../models";
import { genServerlessFinalCode } from "./geenrators/finalFiles/genFinalCode";
import { genBuildStep } from "./geenrators/genBuildStep";
import { genCronJobs } from "./geenrators/genCronJobs";
import { genInitialServerlessCode } from "./geenrators/genInitialCode";
import { genLambdaCode } from "./geenrators/genLambdaCode";
import { genHelperFiles } from "./geenrators/helperFiles/genHelperFiles";
import { generateStatsReport } from "./helper/generateStatsReport";
import { getServiceName } from "./helper/getServiceName";
import { octokitSdk } from "./helper/gitHelpers";
import { pushToGit } from "./helper/pushToGit";
import { deleteAllGenFiles } from "./tool/writeToFile";
import { AiRouter } from "@microfox/ai-router";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { findLastMessageWith } from "@repo/ai-utils/helper";
import { uiTool } from "../ui/uiTool";

//TODO: diffModal to write functions
//TODO: embedding data contextualisation
//TODO: (Requires further thought) shared scripts or files, using a tool call to check if said shared file exists, & fetchit/createit as needed.

const buildFoxAgent = new AiRouter<DefaultMessageMetadata, any, any, any>();

// Tight control required on this route as this burns MOOOOOOOONEEEEEEY
buildFoxAgent.agent("/", async (ctx) => {
  const { request, response } = ctx;

  const lastUserMessage = findLastMessageWith(request.messages, {
    role: "user",
  });

  response.writeMessageMetadata({
    loader: "Thinking about the user's intent...",
  });

  // classify the users query
  const { object: classification, usage } = await generateObject({
    model: models.googleGeminiFlash,
    schema: z.object({
      reasoning: z.string(),
      intent: z.enum(["confirmation", "modification", "initiation", "report"]), // answer, query
      //questionType: z.enum(["query", "answer"]),
      //complexity: z.enum(["simple", "complex"]),
      //queryType: z.enum(["query", "modification", "answer", "confirmation"]),
    }),
    messages: convertToModelMessages([lastUserMessage as any]),
    system: `Classify the users message.
    
    Determine:
    1. User intent (confirmation, modification, question)
    2. Brief reasoning for classification`,
  });

  response.writeMessageMetadata({
    loader: `${classification.intent} observed.`,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    userId: request.userId,
    clientRequestId: request.clientRequestId,
    originClientRequestId: request.originClientRequestId,
    model: models.googleGeminiFlash.modelId,
    usage,
  });

  const timeStart = dayjs();
  const { clientRequestId } = request;

  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
  if (!taskInstanceMeta?.taskInfo) {
    throw new Error("Task instance meta not found");
  }
  let clientRequest = await getClientRequest(clientRequestId);
  if (!clientRequest) {
    throw new Error("Client request not found");
  }

  if (
    classification.intent === "modification" ||
    classification.intent === "report"
  ) {
    //console.log("taskInstanceMeta", taskInstanceMeta.taskStructure);
    // TODO (PAHSE 2): setup this routing in the main router level, to control switching between buildfox & testfox

    const result = streamText({
      model: models.googleGeminiFlash,
      system: `${getMicrofoxCharacter()}, Tell the user kindly that you don't support modification at this step. User can scroll up to make changes before the building has began. and retry building your automation by cliecking refresh!`,
      messages: convertToModelMessages([lastUserMessage as any]),
    });
    response.writeMessageMetadata({
      error:
        "You can't modify the task at this step. Please scroll up to make changes before the building has began. and retry building your automation by cliecking refresh!",
    });
    throw new Error(
      "You can't modify the task at this step. Please scroll up to make changes before the building has began. and retry building your automation by cliecking refresh!"
    );
  }

  response.writeMessageMetadata({
    minionType: "buildfox",
  });

  if (!clientRequest.prUrl) {
    response.writeMessageMetadata({
      loader: "Creating a new codebase for your task",
    });
    clientRequest = await createPullRequest({
      clientRequestId,
      description: taskInstanceMeta.taskInfo?.summary,
      title: taskInstanceMeta.taskInfo?.name,
      requestSubdir: taskInstanceMeta.taskStructure?.templateType,
    });
  }

  const clientSecrets = await prisma.clientSecret.findMany({
    where: {
      clientRequestIds: {
        has: clientRequestId,
      },
    },
  });

  await genInitialServerlessCode(ctx, taskInstanceMeta, clientRequest);

  // generate helper files - like redis, chrome, etc...
  await genHelperFiles(ctx, taskInstanceMeta, clientRequest);

  // write/modify cron jobs
  await genCronJobs(ctx, taskInstanceMeta, clientRequest, clientSecrets);

  // write/modify lambda functions
  await genLambdaCode(ctx, taskInstanceMeta, clientRequest, clientSecrets);

  // write/modify root files - index.ts, package.json, serverless.yml, etc.
  await genServerlessFinalCode(ctx, taskInstanceMeta, clientRequest);

  // re-add core env variables, for they might have been changed
  await addGithubSecretsToRepo({
    repoName: clientRequest.repoName ?? "",
    taskInstanceMeta,
  });

  //if function requires mongodb, & if request does not have mongodb already, then add it
  // await createClientMongoDB({
  //     userId: botProject.userId,
  //     botProjectId: botProject.id,
  //     name: repoResult.data.name,
  // });

  // push to git
  await pushToGit(ctx, clientRequest, taskInstanceMeta);

  if (clientRequestId) {
    console.log("Updating client request", clientRequestId);
    await updateClientRequest({
      clientRequestId: clientRequestId,
      serviceName: getServiceName(clientRequest, taskInstanceMeta),
    });
  }

  // record the changes in the build fox steps taken so far using taskInstanceMeta.
  const { taskInstanceMetaUpdated, envVariables } = await genBuildStep({
    ctx,
    clientRequest,
    taskInstanceMeta,
    timeStart,
  });

  response.writeCustomTool(
    uiTool.construct<"card">("buildfox", "env_collector", {
      uiType: "card",
      text: envVariables.length > 0 ? `All Done !` : `All Done !`,
      object: {
        objectType: "env_collector",
        object: {
          envVariables,
        },
      },
      buttons: [
        {
          text: "Make changes",
          type: "deny",
        },
        {
          action: {
            id: "shiftMinion",
            props: "deployfox",
            actionText: "Test Automation !",
          },
          text: "Test Automation !",
          type: "confirm",
        },
      ],
    })
  );
  // TODO: require a router for further file modifications if needed (means changing the prompts & input Data should be the file)
  // TODO: shiftMinion to deployfox
  try {
    if (clientRequest.prNumber) {
      try {
        await octokitSdk.rest.issues.createComment({
          owner: PROJECT_REPO_OWNER,
          repo: clientRequest.repoName ?? "",
          issue_number: clientRequest.prNumber,
          body: generateStatsReport(taskInstanceMetaUpdated as any),
        });
      } catch (error) {
        console.error("Error sending message to github", error);
      }
    }
    await slackBotSdk.sendMessage({
      text: `BuildFox has finished building the project for - ${clientRequest.title} ✅`,
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: `BuildFox has finished building the project for - ${clientRequest.title}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`${generateStatsReport(taskInstanceMeta as any)}\`\`\``,
          },
        },
      ],
      icon_url: MICROFOX_LOGO,
      username: "Microfox",
      channel: MySlackChannels.microfox_updates,
    });
  } catch (error) {
    console.error("Error sending message to slack", error);
  }

  // delete the files in local directory
  await deleteAllGenFiles(clientRequest);
});

export { buildFoxAgent };
