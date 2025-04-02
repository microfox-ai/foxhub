import {
  ServerStreamingFunction,
  defaultCallbackResultBody,
} from "@repo/ai-utils/router";
import { findLastElementWith } from "@/utils/helpers/array";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { models } from "../models";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCharacter } from "../hellofox/default";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { octokitSdk } from "../buildfox/helper/gitHelpers";
import { TEMPLATE_REPO_OWNER } from "@/utils/constants/githubInfo";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { deployViaGit } from "./deployGit";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { prisma } from "@/prisma/prisma";
import { fetchLogs } from "./fetchLogs";
import { TaskInstanceMetaType } from "../convertfox/types";

export const deployFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const lastUserMessage = findLastElementWith(
    requestBody.messages,
    (m: any) => m.role === "user"
  );

  const { clientRequestId } = requestBody;
  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "deployfox",
  });

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Deploying Automation",
  });

  await updateTaskInstanceMeta({
    clientRequestId,
    otherData: {
      deployStep: {
        startTime: new Date().toISOString(),
        status: "pending",
      },
    },
  });
  // Monitor workflow runs
  await deployViaGit(props, clientRequest, taskInstanceMeta);

  while (true) {
    taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
    if (taskInstanceMeta?.deployStep?.status === "success") {
      break;
    }
    await fetchLogs(
      props,
      clientRequest,
      taskInstanceMeta as TaskInstanceMetaType
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
