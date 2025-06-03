//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { ChatUIMessage, ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { uploadToRepo } from "./uploadToGit";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { TaskInstanceMetaType } from "../../convertfox/types";
import dayjs from "dayjs";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

export const pushToGit = async (
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
    content: "Pushing to codebase...",
  });

  const octo = new Octokit({
    auth: GITHUB_TOKEN,
  });

  console.log(
    "uploading to repo",
    clientRequest.repoName,
    clientRequest.requestDir,
    clientRequest.prBranch
  );

  const lastMessage = await prisma.chatUIMessage.findFirst({
    where: {
      originClientRequestId: clientRequest.id,
      role: "user",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await uploadToRepo(
    octo,
    `${clientRequest.repoName}/${clientRequest.requestDir}`,
    `${clientRequest.repoName}/`,
    PROJECT_REPO_OWNER,
    clientRequest.repoName,
    clientRequest.prBranch,
    "microcode: " +
      taskInstanceMeta.taskInfo?.name +
      " -  by Microfox on " +
      dayjs().format(`YYYY-MM-DD HH:mm`) +
      ` ${lastMessage ? lastMessage.id : "nolast user message found"} `
  );
};

/**
 * Adds a comment to the pull request with a link to the message history
 * @param octo Octokit instance
 * @param clientRequest Client request object
 */
export const addMessageHistoryComment = async (
  octo: Octokit,
  clientRequest: ClientRequest,
  lastMessage: any
) => {
  if (!clientRequest.prNumber || !clientRequest.id || !clientRequest.repoName) {
    console.error("PR number, client request ID, or repo name is missing");
    return;
  }

  try {
    // Create the comment body with the message history link
    const messageHistoryUrl = `${APP_BASE_URL}/session-data?id=${clientRequest.id}`;
    const lastMessageContent = lastMessage
      ? `\n\nLast message: ${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? "..." : ""}`
      : "";

    const commentBody = `## Message History\n\nYou can view the complete conversation history here: [View Message History](${messageHistoryUrl})${lastMessageContent} API-URL: ${APP_BASE_URL}/api/chat/message?requestId=${clientRequest?.id}`;

    // Add the comment to the pull request
    await octo.rest.issues.createComment({
      owner: PROJECT_REPO_OWNER,
      repo: clientRequest.repoName,
      issue_number: clientRequest.prNumber,
      body: commentBody,
    });

    console.log(
      `Added message history comment to PR #${clientRequest.prNumber}`
    );
  } catch (error) {
    console.error("Error adding message history comment:", error);
  }
};
