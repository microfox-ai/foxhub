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
import { fetchLogs } from "./fetchLogs";
import { ClientDeployment } from "@prisma/client";
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
  // Monitor workflow runs
  await deployViaGit(props, clientRequest, taskInstanceMeta);

  const MAX_ATTEMPTS = 30; // 5 minutes total (30 * 10 seconds)
  let attempts = 0;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

    // Handle success case
    if (taskInstanceMeta?.deployStep?.status === "success") {
      break;
    }

    // Handle failure cases
    if (taskInstanceMeta?.deployStep?.status === "failed") {
      throw new Error("Deployment failed");
    }

    // Handle timeout
    if (attempts >= MAX_ATTEMPTS) {
      throw new Error("Deployment timed out after 5 minutes");
    }

    const conditions = await fetchLogs(
      props,
      clientRequest,
      taskInstanceMeta as TaskInstanceMetaType
    );

    if (conditions?.taskInstanceMeta) {
      taskInstanceMeta = conditions?.taskInstanceMeta as any;
    }
    if (conditions?.shouldBreak) {
      break;
    }

    attempts++;
  }

  const clientDeployment = await getClientDeployment(clientRequestId);
  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "deploymentsInfo",
    persona: "deployfox",
    text: `Deployments Completed !`,
    deployStep: taskInstanceMeta?.deployStep as DeployStep,
    clientDeployment: clientDeployment as any,
    buttons: [
      {
        action: "highlightInput",
        text: "Make changes",
        type: "deny",
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "shiftMinion",
        actionText: "Deploy to Production !",
        type: "confirm",
        text: "Deploy to Production !",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "publishfox",
      },
    ],
  });
  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
