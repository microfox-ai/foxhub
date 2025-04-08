import { findLastElementWith } from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
  getClientDeployment,
} from "@/utils/services/db_functions/getClientRequest";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  ServerStreamingFunction,
  defaultCallbackResultBody,
} from "@repo/ai-utils/router";
import { deployViaGit } from "./deployGit";
import {
  DeployStep,
  deployStep,
  TaskInstanceMetaType,
} from "../convertfox/types";
import {
  fetchLogs,
  getLatestRunForClientRequest,
  getRunforClientRequestbySha,
} from "./fetchLogs";
import { ClientDeployment, DEPLOY_STAGE } from "@prisma/client";
import { recloneTemplateStuffToClientRequest } from "./cloneTemplate";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
export const deployFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

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

  //clone template in dev mode
  //await recloneTemplateStuffToClientRequest(props, clientRequest);

  // Monitor workflow runs
  const { sha } = await deployViaGit(props, clientRequest, taskInstanceMeta);
  console.log("sha", sha);
  if (!sha) {
    throw new Error("Sha is undefined");
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Triggered the deployment, waiting 20 seconds ",
  });

  // Wait for 20 seconds before starting to check logs
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, 35000);
  });

  const runId = await getRunforClientRequestbySha({
    head_sha: sha,
    clientRequest,
    stage: DEPLOY_STAGE.STAGING,
  });
  console.log("runId", runId);

  await updateTaskInstanceMeta({
    clientRequestId,
    otherData: {
      deployStep: {
        runId,
        stage: DEPLOY_STAGE.STAGING,
        status: "pending",
      },
    },
  });
  // dataStream.writeMessageAnnotation({
  //   type: "thinking",
  //   value: "Checking logs",
  // });

  // while (true) {
  //   const conditions = await fetchLogs(
  //     props,
  //     clientRequest,
  //     taskInstanceMeta as TaskInstanceMetaType
  //   );
  //   taskInstanceMeta = conditions?.taskInstanceMeta as any;

  //   // Handle success case
  //   if (taskInstanceMeta?.deployStep?.status === "success") {
  //     break;
  //   }

  //   // Handle failure cases
  //   if (taskInstanceMeta?.deployStep?.status === "failed") {
  //     break;
  //   }

  //   // Handle timeout
  //   if (attempts >= MAX_ATTEMPTS) {
  //     throw new Error("Deployment timed out after 5 minutes");
  //   }

  //   if (conditions?.taskInstanceMeta) {
  //     taskInstanceMeta = conditions?.taskInstanceMeta as any;
  //   }
  //   if (conditions?.shouldBreak) {
  //     break;
  //   }

  //   attempts++;
  //   await new Promise((resolve) => setTimeout(resolve, 3000));
  // }

  // const clientDeployment = await getClientDeployment(clientRequestId);
  await slackBotSdk.sendMessage({
    icon_url: MICROFOX_LOGO,
    channel: MySlackChannels.microfox_updates,
    text: `Deployfox triggered a deployment for ${clientRequest.title} ${
      runId ? `with runId ${runId}` : ""
    }`,
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "deploymentsInfo",
    persona: "deployfox",
    text: `Deployments Completed !`,
    pingerInterval: 5000,
    stage: DEPLOY_STAGE.STAGING,
    ...(runId && { runId }),
  });
  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
