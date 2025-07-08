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
import { AiRouter } from "@microfox/ai-router";
import { z } from "zod";
import { deployViaGit } from "./deployGit";
import { IN_STAGING } from "@/utils/constants/appInfo";
import { uiTool } from "../ui/uiTool";

const deployfoxAgent = new AiRouter<any, any, any, any>();

// Register Middlewares
deployfoxAgent.use("/", (ctx, next) => {
  const { request, state, response } = ctx;
  response.writeMessageMetadata({
    minionType: "deployfox",
  });
  return next();
});

// Register agent definitions
// deployfoxAgent.actAsTool("/deployfox", {
//   description: "Deploy automation to specified stage",
//   inputSchema: z.object({
//     clientRequestId: z.string(),
//     stage: z.enum([DEPLOY_STAGE.STAGING, DEPLOY_STAGE.PROD]).optional(),
//     is_local: z.boolean().optional(),
//   }),
// });

// Register agents
deployfoxAgent.agent("/", async (ctx) => {
  const { request, state, response } = ctx;
  const { clientRequestId, stage, is_local, params } = request;

  console.log("requestBody deployfox", request.stage);

  console.log("requestBody deployfox", request.params);
  if (!clientRequestId) {
    response.writeMessageMetadata({
      error: "clientRequestId is required",
    });
    return;
  }

  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    response.writeMessageMetadata({
      error: "Client request or task instance meta not found",
    });
    return;
  }

  console.log("requestBody deployfox", request.params);

  const deployStage = stage || DEPLOY_STAGE.STAGING;
  const isLocal = false;
  // const isLocal =
  //   is_local === undefined || is_local === null
  //     ? IN_STAGING
  //       ? true
  //       : false
  //     : is_local;

  response.writeMessageMetadata({
    loader: `Deploying Automation to ${deployStage} ${isLocal ? "locally" : ""}`,
  });

  // Monitor workflow runs
  const { sha } = await deployViaGit(
    response,
    clientRequest,
    taskInstanceMeta,
    deployStage,
    isLocal
  );

  console.log("sha", sha);
  if (!sha) {
    response.writeMessageMetadata({
      error: "Sha is undefined",
    });
    return;
  }

  response.writeMessageMetadata({
    loader: `Deployment detected, waiting for completion!`,
  });

  await slackBotSdk.sendMessage({
    icon_url: MICROFOX_LOGO,
    channel: MySlackChannels.microfox_updates,
    text: `Deployfox triggered ${deployStage.toLowerCase()} deployment for ${clientRequest.title} ${sha ? `with sha ${sha}` : ""}`,
  });

  response.writeCustomTool(
    uiTool.construct<"card">("deployfox", "deployments_info", {
      uiType: "card",
      text: `Deployments Completed !`,
      object: {
        objectType: "deployments_info",
        object: {
          pingerInterval: 5000,
          stage: deployStage,
          ...(sha && { sha: sha }),
        },
      },
    })
  );
});

export default deployfoxAgent;
