import { prisma } from "@/prisma/prisma";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { GenAiSdk } from "../../utils/services/GenAiSdk";
import { createSlackSDK } from "@microfox/slack-web-tiny";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { SLACK_BOT_OAUTH_TOKEN } from "@/utils/services/slackBotSdk";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { octokitSdk } from "./helper/gitHelpers";
import { AiContext } from "@repo/ai-utils/router";

export async function createPullRequest({
  clientRequestId,
  description,
  title,
  dataStream,
  requestSubdir,
  fullRequestDir,
}: {
  clientRequestId: string;
  description: string;
  title?: string;
  dataStream?: AiContext<any, any, any, any>;
  requestSubdir?: string;
  fullRequestDir?: string;
}) {
  console.log("triggering Pull Request creation");
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  if (!clientRequest) {
    throw new Error("Client request not found");
  }

  const botProject = await prisma.botProject.findUnique({
    where: {
      id: clientRequest.botProjectId,
    },
  });
  if (!botProject) {
    throw new Error("Bot project not found");
  }

  let requestTitle = title;
  if (!requestTitle) {
    // 🔹 Use GenAI to generate a meaningful title for the request
    // TODO: remove this generation
    const generatedTitle = await GenAiSdk.generateShortTitle(
      `client's request: "${description}"`
    );

    if (!generatedTitle) {
      throw new Error("Failed to generate title");
    }

    requestTitle = generatedTitle;
  }

  const githubSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  let uniqueRequestTitle: string;
  let _requestSubdir: string = requestSubdir || "";

  if (fullRequestDir) {
    // Extract uniqueRequestTitle and requestSubdir from fullRequestDir
    const parts = fullRequestDir.split("/");
    if (parts.length >= 3) {
      uniqueRequestTitle = parts[1] || "";
      _requestSubdir = parts[2] || "";
    } else {
      throw new Error(
        "Invalid fullRequestDir format. Expected format: app/title/subdir"
      );
    }
  } else {
    uniqueRequestTitle = `${requestTitle
      .toLowerCase()
      .replace(/ /g, "-")
      // make requestTitle aa good acceptable git branch name
      .replace(/[^a-z0-9-]/g, "-")
      .substring(0, 20)}-${Date.now()}`;

    // TODO: remove this randomization & set requestDIr at a different step when templateType is known.
    _requestSubdir =
      ["alpha", "beta", "gamma", "delta", "omega", "sigma"][
        Math.floor(Math.random() * 6)
      ] || "";
  }

  // Create new branch on GitHub
  const newBranch = `request/${uniqueRequestTitle}`;
  const targetBranch = botProject.githubRepoBranch || "project/master";
  const defaultBranchSha = await githubSdk.rest.git.getRef({
    owner: PROJECT_REPO_OWNER,
    repo: botProject.githubRepoName,
    ref: `heads/${targetBranch}`,
  });
  const newBranchResult = await githubSdk.rest.git.createRef({
    owner: PROJECT_REPO_OWNER,
    repo: botProject.githubRepoName,
    ref: `refs/heads/${newBranch}`,
    sha: defaultBranchSha.data.object.sha,
  });
  if (!newBranchResult) {
    throw new Error("Failed to create new branch");
  }

  // Create README.md file on new branch with request description
  const requestDir = `apps/${uniqueRequestTitle}/${_requestSubdir}`;
  const readmeFilePath = `apps/${uniqueRequestTitle}/README.md`;
  const readmeFileContent =
    await githubSdk.rest.repos.createOrUpdateFileContents({
      owner: PROJECT_REPO_OWNER,
      repo: botProject.githubRepoName,
      path: readmeFilePath,
      message: `[skip ci] Add README for ${requestTitle}`,
      content: Buffer.from(`DESCRIPTION: ${description}`).toString("base64"),
      branch: newBranch,
    });
  if (!readmeFileContent) {
    throw new Error("Failed to update README.md");
  }

  // Create pull request from new branch to target branch
  const pr = await githubSdk.rest.pulls.create({
    owner: PROJECT_REPO_OWNER,
    repo: botProject.githubRepoName,
    title: `New Client Request: ${requestTitle}`,
    body: `<Not for Client> Description: ${description} \n ${APP_BASE_URL}/api/chat/message?requestId=${clientRequestId}`,
    head: `${newBranch}`,
    base: targetBranch,
  });
  if (!pr) {
    throw new Error("Failed to create pull request");
  }

  const updatedClientRequest = await prisma.clientRequest.update({
    where: {
      id: clientRequestId,
    },
    data: {
      title: requestTitle,
      description: description,
      requestDir: requestDir,
      repoName: botProject.githubRepoName,
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      prBranch: pr.data.head.ref,
      prTargetBranch: pr.data.base.ref,
      templateVersion: botProject.templateVersion,
      metadata: {
        pr: {
          html_url: pr.data.html_url,
          url: pr.url,
          title: pr.data.title,
          body: pr.data.body,
          created_at: pr.data.created_at,
          updated_at: pr.data.updated_at,
          closed_at: pr.data.closed_at,
          merged_at: pr.data.merged_at,
          merge_commit_sha: pr.data.merge_commit_sha,
        },
        uniqueRequestTitle: uniqueRequestTitle,
        requestSubdir: _requestSubdir,
        requestFullDir: requestDir,
      },
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  });

  // Create clientRequest.json file on new branch
  const clientRequestFilePath = `apps/${uniqueRequestTitle}/clientRequest.json`;
  const clientRequestFile =
    await githubSdk.rest.repos.createOrUpdateFileContents({
      owner: PROJECT_REPO_OWNER,
      repo: botProject.githubRepoName,
      path: clientRequestFilePath,
      message: `[skip ci] Add clientRequest.json for ${requestTitle}`,
      content: Buffer.from(
        JSON.stringify(updatedClientRequest, null, 2)
      ).toString("base64"),
      branch: newBranch,
    });
  if (!clientRequestFile) {
    dataStream?.response.writeMessageMetadata({
      loader: "Failed to update clientRequest.json",
    });
    throw new Error("Failed to update clientRequest.json");
  }

  // Send slack message
  const slackMsg = `A new request has been created for the project: *${botProject.name}*\n\n*Title*: ${requestTitle}\n*Description*: ${description}\n*PR Link*: ${pr.data.html_url}`;
  await slackBotSdk.sendMessage({
    text: slackMsg,
    channel: MySlackChannels.microfox_updates,
    icon_url: MICROFOX_LOGO,
    username: "Microfox",
  });
  console.log("slackMsg", slackMsg);

  return updatedClientRequest;
}
