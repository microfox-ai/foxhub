import { prisma } from "@/prisma/prisma";
import { TEMPLATE_REPO_OWNER } from "@/utils/constants/customBots";
import { GithubSdk } from "@/utils/services/githubSdk";
import { SlackBotSdk, SlackChannels } from "@/utils/services/slackBotSdk";
import { REQUESTSTATUS } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";

const slackBotSdk = new SlackBotSdk();

interface IMediaPayloadType {
  mediaName: string;
  mediaType: string;
  mediaFormat: string;
  mediaUrl: string;
}
[];

// if the request has been completed, reopen the PR.
// if the request has not been completed, add a comment to the PR.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("body", body);
    const { originClientRequestId, userId, content, context, metadata } = body;
    const mediaPayload: IMediaPayloadType[] = metadata.media || [];

    if (!originClientRequestId || !userId || content === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    /**deprecated */
    if (context === "chat") {
      const storedBotMessage = await prisma.chatUIMessage.create({
        data: {
          originClientRequestId,
          userId,
          content: content,
          context: context,
          role: "assistant",
        },
      });

      return NextResponse.json({
        storedBotMessage: storedBotMessage,
        status: 200,
      });
    }

    const initTime = new Date();

    /** fetch client request */
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
      include: { requestUpdates: true },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 },
      );
    }

    /** get github token */
    const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;

    if (!TMD_GITHUB_TOKEN) {
      console.error("No GitHub token provided");
      return NextResponse.json(
        { error: "GitHub token missing" },
        { status: 500 },
      );
    }

    /** get repo name */
    const repoName = clientRequest?.prUrl?.split("/")[4];

    if (!repoName) {
      console.error("No repo name found in PR URL");
      return NextResponse.json(
        { error: "Repo name not found" },
        { status: 500 },
      );
    }

    /** create github sdk */
    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: repoName,
      token: TMD_GITHUB_TOKEN,
    });

    const requestUpdates = clientRequest.requestUpdates;

    // Find the update with the largest prNumber.
    const lastRequestPrNumber =
      requestUpdates.length > 0
        ? requestUpdates.reduce((acc, curr) =>
            acc.prNumber > curr.prNumber ? acc : curr,
          ).prNumber
        : null;

    // Build Markdown for GitHub preview of attached media.
    const mediaMarkdown =
      mediaPayload.length > 0
        ? "\n\n**Attached Media:**\n\n" +
          mediaPayload
            .map((m) =>
              m.mediaType.startsWith("image")
                ? `![${m.mediaName}](${m.mediaUrl})`
                : `[${m.mediaName}](${m.mediaUrl})`,
            )
            .join("\n")
        : "";

    // If the request has been completed (pr merged), perform reopening logic.
    if (clientRequest.requestStatus === REQUESTSTATUS.COMPLETED) {
      const newBranch = `reopen-${clientRequest.requestUpdates.length + 1}-${clientRequest.prBranch}`;

      await appRepoSdk.createBranch({
        branchName: newBranch,
        baseBranch: clientRequest.prTargetBranch,
      });

      const prBody = `Reopen PR for Client Request #${
        lastRequestPrNumber || clientRequest.prNumber
      }: ${content}${mediaMarkdown}`;

      // 2️⃣ Add a README file in the new branch
      await appRepoSdk.updateFile({
        path: `${clientRequest.requestDir}/reopen-${clientRequest.requestUpdates.length + 1}.md`,
        content: prBody,
        commitMessage: `Add README for ${newBranch}`,
        branch: newBranch,
      });

      // Create a new pull request.
      const prResult: any = await appRepoSdk.createPullRequest({
        title: `Reopen PR for Client Request #${
          lastRequestPrNumber || clientRequest.prNumber
        }: ${clientRequest.title}`,
        head: newBranch,
        base: clientRequest.prTargetBranch,
        body: prBody,
      });

      if (!prResult) {
        return NextResponse.json(
          { error: "Failed to reopen PR" },
          { status: 500 },
        );
      }

      // Save the PR update.
      await prisma.requestUpdate.create({
        data: {
          originClientRequestId,
          botProjectId: clientRequest.botProjectId,
          userId,
          prNumber: prResult.number,
          prUrl: prResult.html_url,
          prBranch: newBranch,
          prTargetBranch: clientRequest.prTargetBranch,
          metadata: prResult,
          createdAt: initTime,
          updatedAt: initTime,
        },
      });

      const updatedClientRequest = await prisma.clientRequest.update({
        where: { id: originClientRequestId },
        data: { requestStatus: REQUESTSTATUS.UN_ASSIGNED },
        include: { requestUpdates: true },
      });

      const clientRequestFilePath = `${updatedClientRequest.requestDir}/clientRequest.json`;
      const updatedClientRequestData = {
        id: updatedClientRequest.id,
        botProjectId: updatedClientRequest.botProjectId,
        userId: updatedClientRequest.userId,
        title: updatedClientRequest.title,
        description: updatedClientRequest.description,
        requestDir: updatedClientRequest.requestDir,
        prUrl: updatedClientRequest.prUrl,
        prNumber: updatedClientRequest.prNumber,
        prBranch: updatedClientRequest.prBranch,
        prTargetBranch: updatedClientRequest.prTargetBranch,
        requestUpdates: updatedClientRequest.requestUpdates,
        metadata: updatedClientRequest.metadata,
        createdAt: updatedClientRequest.createdAt,
      };

      await appRepoSdk.updateFile({
        path: clientRequestFilePath,
        content: JSON.stringify(updatedClientRequestData, null, 2),
        commitMessage: `Updated clientRequest.json`,
        branch: newBranch,
      });

      // // Refresh client request updates.
      // await updateClientRequest(clientRequest);

      await prisma.chatUIMessage.create({
        data: {
          originClientRequestId,
          userId,
          content: content,
          metadata: {
            media: mediaPayload as unknown as InputJsonValue[],
          },
          context: context,
          role: "user",
          minionType: "other",
          createdAt: initTime,
          updatedAt: initTime,
        },
      });
      await prisma.chatUIMessage.create({
        data: {
          originClientRequestId,
          userId,
          content: `Your request has been reopened. We'll get back to you soon.`,
          context: "server",
          role: "assistant",
          minionType: "other",
          createdAt: initTime,
          updatedAt: initTime,
        },
      });

      const slackMsg = `A request with title: *${clientRequest.title}* has been reopened with message: ${content}. [View PR](${prResult.html_url})`;

      await slackBotSdk.sendSlackMessageviaAPI({
        text: slackMsg,
        channel:
          process.env.NODE_ENV === "production"
            ? SlackChannels.p_3_custombots
            : SlackChannels.test_slackbot,
      });
    } else {
      // Normal case: add a comment to the PR with media preview.
      const commentBody = `<Not for Client> Msg from Client: ${content}${mediaMarkdown}`;
      await appRepoSdk.createCommentOnPr(
        lastRequestPrNumber || clientRequest.prNumber,
        commentBody,
      );
      // await updateClientRequest(clientRequest);

      await prisma.chatUIMessage.create({
        data: {
          originClientRequestId,
          userId,
          content: content,
          metadata: {
            media: mediaPayload as unknown as InputJsonValue[],
          },
          context: "chat",
          role: "user",
          minionType: "other",
          createdAt: initTime,
          updatedAt: initTime,
        },
      });
    }

    const updatedRequestMessages = await prisma.chatUIMessage.findMany({
      where: { originClientRequestId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { chatUIMessages: updatedRequestMessages },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving chat message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
