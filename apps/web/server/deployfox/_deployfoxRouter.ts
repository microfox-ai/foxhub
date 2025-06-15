import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { DEPLOY_STAGE } from "@prisma/client";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { deployViaGit } from "./deployGit";
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

  const stage = requestBody.stage;
  const isLocal = requestBody.is_local;

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "deployfox",
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Deploying Automation to ${stage ?? DEPLOY_STAGE.STAGING} ${isLocal ? "locally" : ""}`,
  });

  //clone template in dev mode
  // await recloneTemplateStuffToClientRequest(props, clientRequest);

  // Monitor workflow runs
  const { sha } = await deployViaGit(
    props,
    clientRequest,
    taskInstanceMeta,
    stage,
    isLocal
  );
  console.log("sha", sha);
  if (!sha) {
    throw new Error("Sha is undefined");
  }

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Deploymnent detected, waiting for completion!`,
  });

  // const clientDeployment = await getClientDeployment(clientRequestId);
  await slackBotSdk.sendMessage({
    icon_url: MICROFOX_LOGO,
    channel: MySlackChannels.microfox_updates,
    text: `Deployfox triggered ${(stage ?? DEPLOY_STAGE.STAGING).toLowerCase()} deployment for ${clientRequest.title} ${
      sha ? `with sha ${sha}` : ""
    }`,
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "deploymentsInfo",
    persona: "deployfox",
    text: `Deployments Completed !`,
    pingerInterval: 5000,
    stage: stage ?? DEPLOY_STAGE.STAGING,
    ...(sha && { sha: sha }),
  });
  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
