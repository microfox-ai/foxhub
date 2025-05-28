//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { ClientRequest, DEPLOY_STAGE, DEPLOY_STATUS } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { uploadToRepo } from "../buildfox/helper/uploadToGit";
import {
  GITHUB_TOKEN,
  PROJECT_REPO_OWNER,
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { TaskInstanceMetaType } from "../convertfox/types";
import dayjs from "dayjs";
import { getTemplateVersion } from "@/utils/services/github_functions/getTemplateVersion";
import { cloneTemplate } from "./cloneTemplate";
import { prisma } from "@/prisma/prisma";

export const deployViaGit = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  stage: DEPLOY_STAGE
) => {
  const { dataStream } = props;

  if (
    !clientRequest.repoName ||
    !clientRequest.requestDir ||
    !clientRequest.prBranch
  ) {
    throw new Error("Repo name or request dir or pr branch is required");
  }

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Deploying a ${stage ?? DEPLOY_STAGE.STAGING} version of automation`,
  });

  const { sha } = await triggerDeployment(
    clientRequest,
    stage ?? DEPLOY_STAGE.STAGING,
    false,
    taskInstanceMeta
  );

  return { sha };
};

export const triggerDeployment = async (
  clientRequest: ClientRequest,
  stage: DEPLOY_STAGE,
  isDelete?: boolean,
  taskInstanceMeta?: TaskInstanceMetaType
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
      message: `${stage}: deployfox: ${isDelete ? "DELETE: deleting the serverless function" : " Update CHANGELOG.md to trigger deployment"}`,
      content: Buffer.from(
        `# Deployment Log\n\n` +
          `## Latest Deployment\n` +
          `- Timestamp: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}\n` +
          `- Details:\n` +
          `\`\`\`json\n${taskInstanceMeta ? JSON.stringify(taskInstanceMeta?.deployStep, null, 2) : "{}"}\n\`\`\`\n`
      ).toString("base64"),
      branch: clientRequest.prBranch,
      ...(sha ? { sha } : {}),
    });

    try {
      await prisma.clientDeployment.updateMany({
        where: { originClientRequestId: clientRequest.id },
        data: {
          status: DEPLOY_STATUS.TRIGGERED,
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
