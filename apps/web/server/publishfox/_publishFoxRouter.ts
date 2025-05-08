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

export const publishFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const { clientRequestId } = requestBody;
  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);
  let shardPage = await prisma.shardPage.findFirst({
    where: {
      clientRequestId: clientRequestId,
    },
  });

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

  const shardId = shardPage?.repoDir
    ? shardPage.repoDir
    : "shards/" + clientRequest.serviceName + "/v1";
  try {
    // Clone the code from client request repo to published-shards repo
    await cloneTemplate({
      sourceOwner: PROJECT_REPO_OWNER,
      targetOwner: TEMPLATE_REPO_OWNER,
      sourceRepo: clientRequest.repoName || "",
      targetRepo: PUBLISHED_SHARD_REPO,
      sourcePath: clientRequest.requestDir || "",
      targetPath: clientRequest.requestDir || "",
      sourceBranch: clientRequest.prBranch || "main",
      targetBranch: "main",
      commitMessage: `nodeploy: Publishfox published shard for ${clientRequest.title}`,
      excludeFiles: ["clientRequest.json"],
    });

    // In future when action is outsourced to users.
    // Create a pull request
    // const { data: pr } = await octokit.rest.pulls.create({
    //   owner: TEMPLATE_REPO_OWNER,
    //   repo: PUBLISHED_SHARD_REPO,
    //   title: `Publish: ${clientRequest.title}`,
    //   body: `Publishing automation from ${clientRequest.title}\n\nDescription: ${clientRequest.description}`,
    //   head: branchName,
    //   base: "main",
    // });

    // Create ShardPage entry
    if (shardPage) {
      await prisma.shardPage.update({
        where: { id: shardPage.id },
        data: {
          taskInstanceMeta: taskInstanceMeta || {},
        },
      });
    } else {
      shardPage = await prisma.shardPage.create({
        data: {
          taskInstanceMeta: taskInstanceMeta || {},
          clientRequestMeta: {
            title: clientRequest.title,
            description: clientRequest.description || "",
            repoName: clientRequest.repoName || "",
            repoDir: clientRequest.requestDir || "",
            prBranch: clientRequest.prBranch || "",
            prNumber: clientRequest.prNumber || "",
            prUrl: clientRequest.prUrl || "",
            metadata: clientRequest.metadata || {},
          },
          repoDir: clientRequest.requestDir || "",
          title: clientRequest.title,
          description: clientRequest.description || "",
          version: "1.0.0", // Initial version
          versionNumber: "1", // Initial version number
          creatorId: clientRequest.userId,
          clientRequestId: clientRequestId,
        },
      });
    }

    await slackBotSdk.sendMessage({
      icon_url: MICROFOX_LOGO,
      channel: MySlackChannels.microfox_updates,
      text: `Publishfox triggered a publication for ${clientRequest.title}. Shard ID: ${shardPage.id}`,
    });

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
          text: "View Store Page !",
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
