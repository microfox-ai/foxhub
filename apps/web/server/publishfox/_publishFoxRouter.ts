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
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
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

export const publishFoxRouter: ServerStreamingFunction<
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

  if (!clientRequest.serviceName) {
    dataStream.writeMessageAnnotation({
      type: "error",
      content: "Service name is required to publish an automation",
    });
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: MinionType.PublishFox,
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Publishing your automation",
  });

  // Create a new branch name based on the client request
  //const branchName = `publish-${clientRequest.id}-${Date.now()}`;
  try {
    const { shardPage } = await publishShard(clientRequest, taskInstanceMeta);

    dataStream.writeMessageAnnotation({
      type: "ui",
      objectType: "publicationInfo",
      persona: "publishfox",
      text: "Publication Completed! Shard has been created.",
      buttons: [
        {
          action: "highlightInput",
          text: "Make changes",
          type: "deny",
          className: "bg-neutral-200 text-black hover:bg-neutral-300",
        },
        {
          action: "link",
          actionText: "View Store Page !",
          text: "View Store Page",
          type: "confirm",
          url: `${APP_BASE_URL}/store/edit/${shardPage.id}`,
        },
      ],
    });
  } catch (error) {
    console.error("Error publishing automation:", error);
    dataStream.writeMessageAnnotation({
      type: "error",
      content: "Failed to publish automation. Please try again.",
    });
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
