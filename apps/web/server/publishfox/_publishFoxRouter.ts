import { MinionType } from "@/components/screens/hooks/convertors";
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
import { Octokit } from "octokit";
import {
  GITHUB_TOKEN,
  PROJECT_REPO_OWNER,
  PUBLISHED_SHARD_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { cloneTemplate } from "../deployfox/cloneTemplate";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { publishShard } from "@/utils/services/db_functions/publishShard";
import { AiRouter } from "@microfox/ai-router";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { uiTool } from "../ui/uiTool";

const publishFoxAgent = new AiRouter<DefaultMessageMetadata, any, any, any>();

publishFoxAgent.agent("/", async (ctx) => {
  const { request, response } = ctx;

  const { clientRequestId } = request;
  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    response.writeMessageMetadata({
      error: "Client request or task instance meta not found",
    });
    return;
  }

  if (!clientRequest.serviceName) {
    response.writeMessageMetadata({
      error: "Service name is required to publish an automation",
    });
    return;
  }

  response.writeMessageMetadata({
    minionType: MinionType.PublishFox,
    loader: "Publishing your automation",
  });

  // Create a new branch name based on the client request
  //const branchName = `publish-${clientRequest.id}-${Date.now()}`;
  try {
    const { shardPage } = await publishShard(clientRequest, taskInstanceMeta);

    response.writeCustomTool(
      uiTool.construct<"card">("publishfox", "publicationInfo", {
        uiType: "card",
        text: "Publication Completed! Shard has been created.",
        buttons: [
          {
            text: "Make changes",
            type: "deny",
          },
          {
            action: {
              id: "link",
              props: `${APP_BASE_URL}/store/edit/${shardPage.id}`,
              actionText: "View Store Page",
            },
            text: "View Store Page",
            type: "confirm",
          },
        ],
        object: {
          objectType: "publication_info",
          object: {
            shardPage: shardPage,
          },
        },
      })
    );
  } catch (error) {
    console.error("Error publishing automation:", error);
    response.writeMessageMetadata({
      error: "Failed to publish automation. Please try again.",
    });
  }
});

export { publishFoxAgent };
