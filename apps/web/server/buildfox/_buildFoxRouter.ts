import { createPullRequest } from "@/server/buildfox/createPullRequest";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { findLastElementWith } from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { generateObject, streamText } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCharacter } from "../hellofox/default";
import { models } from "../models";
import { genCronJobs } from "./geenrators/genCronJobs";
import { genDbCode } from "./geenrators/genDbCode";
import { genEnvCollector } from "./geenrators/genEnvCollector";
import { genFinalCode } from "./geenrators/genFinalCode";
import { genInitialCode } from "./geenrators/genInitialCode";
import { genLambdaCode } from "./geenrators/genLambdaCode";
import { generateStatsReport } from "./helper/generateStatsReport";
import { octokitSdk } from "./helper/gitHelpers";
import { pushToGit } from "./helper/pushToGit";
import { deleteAllGenFiles, readAllGenFilesList } from "./tool/writeToFile";
import { addGithubSecretsToRepo } from "@/utils/services/db_functions/createNewBotProject";
import { getServiceName } from "./helper/getServiceName";

//TODO: diffModal to write functions
//TODO: embedding data contextualisation
//TODO: (Requires further thought) shared scripts or files, using a tool call to check if said shared file exists, & fetchit/createit as needed.

// Tight control required on this route as this burns MOOOOOOOONEEEEEEY
export const buildFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const lastUserMessage = findLastElementWith(
    requestBody.messages,
    (m: any) => m.role === "user"
  );

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Thinking about the user's intent...",
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
    messages: [lastUserMessage],
    system: `Classify the users message.
    
    Determine:
    1. User intent (confirmation, modification, question)
    2. Brief reasoning for classification`,
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `${classification.intent} observed.`,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    ...requestBody,
    model: models.googleGeminiFlash.modelId,
    usage,
  });

  const timeStart = dayjs();
  const { clientRequestId } = requestBody;

  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
  if (!taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }
  let clientRequest = await getClientRequest(clientRequestId);
  if (!clientRequest) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
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
      messages: [lastUserMessage],
    });
    result.mergeIntoDataStream(dataStream, {
      experimental_sendFinish: true,
    });
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "buildfox",
  });

  if (!clientRequest.prUrl) {
    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Creating a new codebase for your task",
    });
    clientRequest = await createPullRequest({
      clientRequestId,
      description: taskInstanceMeta.taskInfo?.summary,
      title: taskInstanceMeta.taskInfo?.name,
      requestSubdir: taskInstanceMeta.taskStructure?.templateType,
    });
  }

  await genInitialCode(props, taskInstanceMeta, clientRequest);

  await genDbCode(props, taskInstanceMeta, clientRequest);

  //write/modify cron jobs
  await genCronJobs(props, taskInstanceMeta, clientRequest);

  // write/modify lambda functions
  await genLambdaCode(props, taskInstanceMeta, clientRequest);

  // write/modify root files - index.ts, package.json, serverless.yml, etc.
  await genFinalCode(props, taskInstanceMeta, clientRequest);

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
  await pushToGit(props, clientRequest, taskInstanceMeta);

  if (clientRequestId) {
    console.log("Updating client request", clientRequestId);
    await updateClientRequest({
      clientRequestId: clientRequestId,
      serviceName: getServiceName(clientRequest, taskInstanceMeta),
    });
  }

  // record the changes in the build fox steps taken so far using taskInstanceMeta.
  const filesList = await readAllGenFilesList(clientRequest, true);
  const newFilesList = filesList.map((file: any) => ({
    fileName: file.fileName,
    filePath: file.filePath,
    fileType: file.fileType,
    meta: file.meta,
  }));

  const allEnvVariablesUsed = newFilesList?.flatMap(
    (file: any) => (file.meta?.envVariablesUsed as string[]) ?? []
  );
  const envVariablesUsedUnique = [...new Set(allEnvVariablesUsed)] as string[];
  const allPackagesUsed = newFilesList?.flatMap(
    (file: any) => (file.meta?.packagesUsed as string[]) ?? []
  );
  const packagesUsedUnique = [...new Set(allPackagesUsed)];

  console.log("envVariablesUsedUnique", envVariablesUsedUnique);
  const envVariables = await genEnvCollector(
    props,
    envVariablesUsedUnique,
    taskInstanceMeta,
    clientRequest
  );
  console.log("envVariablesShouldAsk", envVariables);

  const timeEnd = dayjs();
  const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
    clientRequestId,
    taskInstanceMeta: {
      ...taskInstanceMeta,
      buildingStep: {
        startTime: timeStart,
        endTime: timeEnd,
        ...taskInstanceMeta.buildingStep,
        files: newFilesList,
        envsToCollect: envVariables,
        envVariablesUsed: envVariablesUsedUnique,
        packagesUsed: allPackagesUsed,
      },
    },
  });

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

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "envCollector",
    persona: "buildfox",
    text: `Need Some Minor Details !`,
    envVariablesAll: envVariablesUsedUnique as any[],
    packagesUsed: packagesUsedUnique as any[],
    envVariablesCollect: envVariables as any[],
    buttons: [
      {
        action: "highlightInput",
        text: "Make changes",
        type: "deny",
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "shiftMinion",
        actionText: "Test Automation !",
        type: "confirm",
        text: "Test Automation !",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "deployfox",
      },
    ],
  });

  if (envVariables.length === 0) {
    dataStream.writeMessageAnnotation({
      type: "ui",
      objectType: "buttons",
      persona: "buildfox",
      text: `All Done !`,
      buttons: [
        {
          action: "highlightInput",
          text: "Make changes",
          type: "deny",
          className: "bg-neutral-200 text-black hover:bg-neutral-300",
        },
        {
          action: "shiftMinion",
          actionText: "Test Automation !",
          text: "Test Automation !",
          type: "confirm",
          className: "bg-green-500 text-white hover:bg-green-600",
          value: "deployfox",
        },
      ],
    });
  }
  // TODO: require a router for further file modifications if needed (means changing the prompts & input Data should be the file)
  // TODO: shiftMinion to deployfox
  try {
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

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
