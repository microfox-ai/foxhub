import { MySlackChannels } from "../slackBotSdk";
import isEqual from "lodash/isEqual";

import { prisma } from "@/prisma/prisma";
import { cloneTemplate } from "@/server/deployfox/cloneTemplate";
import { PUBLISHED_SHARD_REPO } from "@/utils/constants/githubInfo";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { TEMPLATE_REPO_OWNER } from "@/utils/constants/githubInfo";
import { ClientRequest, TaskInstanceMeta } from "@prisma/client";
import { slackBotSdk } from "../slackBotSdk";
import { MICROFOX_LOGO } from "../slackBotSdk";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";

export async function publishShard(
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMeta | TaskInstanceMetaType,
  extraData?: any
) {
  let shardPage = await prisma.shardPage.findFirst({
    where: {
      clientRequestId: clientRequest.id,
    },
  });
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
    commitMessage: `[skip ci] Publishfox published shard for ${clientRequest.title}`,
    excludeFiles: ["clientRequest.json", "CHANGELOG.md"],
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

  if (
    shardPage &&
    shardPage.taskInstanceMeta &&
    isEqual(shardPage.taskInstanceMeta, taskInstanceMeta)
  ) {
    if (extraData) {
      shardPage = await prisma.shardPage.update({
        where: { id: shardPage.id },
        data: {
          ...extraData,
        },
      });
    }
    return { shardPage, updated: extraData ? true : false };
  }

  // Create ShardPage entry
  if (shardPage) {
    shardPage = await prisma.shardPage.update({
      where: { id: shardPage.id },
      data: {
        ...extraData,
        taskInstanceMeta: taskInstanceMeta || {},
        version: `${parseInt((shardPage.version ?? "1.0.0").split(".")?.[0] ?? "1") + 1}.0.0`,
        versionNumber: (
          parseInt(shardPage.versionNumber || "1") + 1
        ).toString(),
      },
    });
  } else {
    shardPage = await prisma.shardPage.create({
      data: {
        taskInstanceMeta: taskInstanceMeta || {},
        clientRequestMeta: {
          title:
            (taskInstanceMeta?.taskInfo as any)?.name || clientRequest.title,
          description:
            (taskInstanceMeta?.taskInfo as any)?.summary ||
            clientRequest.description ||
            "",
          miniDescription: (taskInstanceMeta?.taskInfo as any)?.goal || "",
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
        clientRequestId: clientRequest.id,
        ...extraData,
      },
    });
  }

  await slackBotSdk.sendMessage({
    icon_url: MICROFOX_LOGO,
    channel: MySlackChannels.microfox_updates,
    text: `Publishfox triggered a publication for ${clientRequest.title}. Shard ID: ${shardPage.id}, Version: ${shardPage.version}`,
  });

  return { shardPage, updated: true };
}
