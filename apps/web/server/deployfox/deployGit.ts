//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { uploadToRepo } from "../buildfox/helper/uploadToGit";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { TaskInstanceMetaType } from "../convertfox/types";
import dayjs from "dayjs";
export const deployViaGit = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType
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
    type: "thinking",
    value: "Deploying a test version of automation",
  });

  await triggerDeployment(
    clientRequest,
    taskInstanceMeta,
    DEPLOY_STAGE.STAGING
  );

  // TODO: push to git file by file (if above doesn't work)
};

export const triggerDeployment = async (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  stage: DEPLOY_STAGE
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

  if (stage === DEPLOY_STAGE.PROD) {
    try {
      if (!clientRequest.prNumber) {
        throw new Error("Pull request number is required");
      }
      // Merge the pull request
      await octo.rest.pulls.merge({
        owner: TEMPLATE_REPO_OWNER,
        repo: clientRequest.repoName,
        pull_number: clientRequest.prNumber,
        merge_method: "merge",
      });

      console.log(
        `Successfully merged pull request #${clientRequest.prNumber}`
      );
    } catch (error) {
      console.error("Error merging pull request:", error);
      throw error;
    }
  }

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

    const changelogPath = `apps/${uniqueRequestTitle}/CHANGELOG.md`;

    // Get the current SHA of the file
    let sha: string | undefined;
    try {
      const { data: fileData } = await octo.rest.repos.getContent({
        owner: TEMPLATE_REPO_OWNER,
        repo: clientRequest.repoName,
        path: changelogPath,
        ref: clientRequest.prBranch,
      });

      if ("sha" in fileData) {
        sha = fileData.sha;
      }
    } catch (error) {
      // If file doesn't exist, that's okay - we'll create it
      console.log("error", error);

      console.log("File does not exist yet, will create new file");
    }

    // Create a commit with timestamp update in clientRequest.json
    const { data } = await octo.rest.repos.createOrUpdateFileContents({
      owner: TEMPLATE_REPO_OWNER,
      repo: clientRequest.repoName,
      path: changelogPath,
      message: "deployfox: Update CHANGELOG.md to trigger deployment",
      content: Buffer.from(
        `# Deployment Log\n\n` +
          `## Latest Deployment\n` +
          `- Timestamp: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}\n` +
          `- Details:\n` +
          `\`\`\`json\n${JSON.stringify(taskInstanceMeta.deployStep, null, 2)}\n\`\`\`\n`
      ).toString("base64"),
      branch: clientRequest.prBranch,
      ...(sha ? { sha } : {}),
    });

    console.log("Created deployment trigger commit");
  } catch (error) {
    console.log("error", error);
  }
};
