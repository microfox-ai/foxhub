//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  PROJECT_REPO_OWNER,
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { getTemplateVersion } from "@/utils/services/github_functions/getTemplateVersion";
import { ClientRequest, DEPLOY_STAGE, DEPLOY_STATUS } from "@prisma/client";
import dayjs from "dayjs";
import { Octokit } from "octokit";
import { TaskInstanceMetaType } from "../convertfox/helpers/types";
import { cloneTemplate } from "./cloneTemplate";
import { UIMessageStreamWriter } from "ai";
import { AiStreamWriter } from "@repo/ai-utils/router";
import { UITools } from "@repo/ai-utils/types";

export const deployViaGit = async (
  writer: AiStreamWriter<any, any, UITools>,
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  stage: DEPLOY_STAGE,
  isLocal: boolean
) => {
  if (
    !clientRequest.repoName ||
    !clientRequest.requestDir ||
    !clientRequest.prBranch
  ) {
    throw new Error("Repo name or request dir or pr branch is required");
  }

  writer.writeMessageMetadata({
    loader: `Deploying a ${stage ?? DEPLOY_STAGE.STAGING} version of automation ${isLocal ? "locally" : ""}`,
  });

  const { sha } = await triggerDeployment(
    clientRequest,
    stage ?? DEPLOY_STAGE.STAGING,
    false,
    taskInstanceMeta,
    isLocal
  );

  return { sha };
};

export const triggerDeployment = async (
  clientRequest: ClientRequest,
  stage: DEPLOY_STAGE,
  isDelete?: boolean,
  taskInstanceMeta?: TaskInstanceMetaType,
  isLocal?: boolean
) => {
  if (
    !clientRequest.repoName ||
    !clientRequest.requestDir ||
    !clientRequest.prBranch
  ) {
    throw new Error("Repo name or request dir or pr branch is required");
  }

  const octo = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    console.log(
      "Creating clientRequest.json update to trigger deployment",
      clientRequest.repoName,
      clientRequest.prBranch
    );

    const uniqueRequestTitle = (clientRequest.metadata as any)
      ?.uniqueRequestTitle;

    if (!uniqueRequestTitle) {
      throw new Error("Unique request title is required");
    }
    await checkAndUpdateTemplateVersion(clientRequest);

    const changelogPath = `apps/${uniqueRequestTitle}/CHANGELOG.md`;
    // Get the current SHA of the file
    let sha: string | undefined;
    try {
      const { data: fileData } = await octo.rest.repos.getContent({
        owner: PROJECT_REPO_OWNER,
        repo: clientRequest.repoName,
        path: changelogPath,
        ref: clientRequest.prBranch,
      });

      if ("sha" in fileData) {
        sha = fileData.sha;
        console.log("Changelog SHA:", sha);
      }
    } catch (error) {
      // If file doesn't exist, that's okay - we'll create it
      console.log("error", error);

      console.log("File does not exist yet, will create new file");
    }

    // Create a commit with timestamp update in clientRequest.json
    const { data } = await octo.rest.repos.createOrUpdateFileContents({
      owner: PROJECT_REPO_OWNER,
      repo: clientRequest.repoName,
      path: changelogPath,
      message: `${stage}: deployfox: ${isLocal ? "LOCAL: starting local automation" : isDelete ? "DELETE: deleting the serverless function" : " Update CHANGELOG.md to trigger deployment"}`,
      content: Buffer.from(
        `# Deployment Log\n\n` +
          `## Latest Deployment\n` +
          `- Timestamp: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}\n` +
          `- Details:\n` +
          `\`\`\`json\n${taskInstanceMeta ? JSON.stringify(taskInstanceMeta, null, 2) : "{}"}\n\`\`\`\n`
      ).toString("base64"),
      branch: clientRequest.prBranch,
      ...(sha ? { sha } : {}),
    });

    try {
      await prisma.clientDeployment.updateMany({
        where: { originClientRequestId: clientRequest.id },
        data: {
          status: DEPLOY_STATUS.TRIGGERED,
          sha: data.commit.sha,
        },
      });
    } catch (error) {
      console.log("error updating client deployment status", error);
    }

    console.log("Created deployment trigger commit");
    return { sha: data.commit.sha };
  } catch (error) {
    console.log("error", error);
    return { sha: undefined };
  }
};

const checkAndUpdateTemplateVersion = async (clientRequest: ClientRequest) => {
  const latestTemplateVersion = await getTemplateVersion();
  console.log("Latest Template Version:", latestTemplateVersion);
  console.log(
    "Client Request Template Version:",
    clientRequest.templateVersion
  );
  if (clientRequest.templateVersion !== latestTemplateVersion) {
    console.log("Template version mismatch, cloning template");
    await cloneTemplate({
      sourceOwner: TEMPLATE_REPO_OWNER,
      targetOwner: PROJECT_REPO_OWNER,
      sourceRepo: TEMPLATE_REPO,
      targetRepo: clientRequest.repoName ?? "",
      sourcePath: "",
      targetPath: "",
      sourceBranch: "main",
      targetBranch: clientRequest.prBranch ?? "",
    });
    await cloneTemplate({
      sourceOwner: TEMPLATE_REPO_OWNER,
      targetOwner: PROJECT_REPO_OWNER,
      sourceRepo: TEMPLATE_REPO,
      targetRepo: clientRequest.repoName ?? "",
      sourcePath: "",
      targetPath: "",
      sourceBranch: "main",
      targetBranch: "project/master",
    });
    await prisma.clientRequest.update({
      where: { id: clientRequest.id },
      data: {
        templateVersion: latestTemplateVersion,
      },
    });
    console.log(
      "Client Request Template Version updated to",
      latestTemplateVersion
    );
  }
};
