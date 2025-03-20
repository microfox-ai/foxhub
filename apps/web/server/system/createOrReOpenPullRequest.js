import { prisma } from "@/prisma/prisma";
import { TEMPLATE_REPO_OWNER } from "@/utils/constants/customBots";
import { GithubSdk } from "@/utils/services/githubSdk";
import { REQUESTSTATUS } from "@prisma/client";
import { SlackChannels, SlackBotSdk } from "@/utils/services/slackBotSdk";
const slackBotSdk = new SlackBotSdk();
export const createOrReOpenPullRequest = async ({ dataStream, requestBody, responseBody }) => {
    const messages = requestBody.messages;
    const { originClientRequestId, userId, content, context, metadata } = requestBody;
    const mediaPayload = metadata.media || [];
    if (!originClientRequestId || !userId || content === undefined) {
        throw new Error("Missing required fields");
    }
    /**deprecated */
    // if (context === "chat") {
    //   const storedBotMessage = await prisma.chatUIMessage.create({
    //     data: {
    //       originClientRequestId,
    //       userId,
    //       content: content,
    //       context: context,
    //       role: "assistant",
    //     },
    //   });
    //   return NextResponse.json({
    //     storedBotMessage: storedBotMessage,
    //     status: 200,
    //   });
    // }
    const initTime = new Date();
    /** fetch client request */
    dataStream.writeData({
        type: "status",
        status: "fetching your request",
    });
    const clientRequest = await prisma.clientRequest.findUnique({
        where: { id: originClientRequestId },
        include: { requestUpdates: true },
    });
    if (!clientRequest) {
        throw new Error("Client request not found");
    }
    /** get github token */
    const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
    if (!TMD_GITHUB_TOKEN) {
        throw new Error("GitHub token missing");
    }
    /** get repo name */
    const repoName = clientRequest?.prUrl?.split("/")[4];
    if (!repoName) {
        throw new Error("Repo name not found");
    }
    /** create github sdk */
    const appRepoSdk = new GithubSdk({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoName,
        token: TMD_GITHUB_TOKEN,
    });
    const requestUpdates = clientRequest.requestUpdates;
    // Find the update with the largest prNumber.
    const lastRequestPrNumber = requestUpdates.length > 0
        ? requestUpdates.reduce((acc, curr) => acc.prNumber > curr.prNumber ? acc : curr).prNumber
        : null;
    // Build Markdown for GitHub preview of attached media.
    const mediaMarkdown = mediaPayload.length > 0
        ? "\n\n**Attached Media:**\n\n" +
            mediaPayload
                .map((m) => m.mediaType.startsWith("image")
                ? `![${m.mediaName}](${m.mediaUrl})`
                : `[${m.mediaName}](${m.mediaUrl})`)
                .join("\n")
        : "";
    // If the request has been completed (pr merged), perform reopening logic.
    if (clientRequest.requestStatus === REQUESTSTATUS.COMPLETED) {
        const newBranch = `reopen-${clientRequest.requestUpdates.length + 1}-${clientRequest.prBranch}`;
        dataStream.writeData({
            type: "status",
            status: `creating new branch - ${newBranch}`,
        });
        await appRepoSdk.createBranch({
            branchName: newBranch,
            baseBranch: clientRequest.prTargetBranch,
        });
        const prBody = `Reopen PR for Client Request #${lastRequestPrNumber || clientRequest.prNumber}: ${content}${mediaMarkdown}`;
        dataStream.writeData({
            type: "status",
            status: "updating file",
        });
        // 2️⃣ Add a README file in the new branch
        await appRepoSdk.updateFile({
            path: `${clientRequest.requestDir}/reopen-${clientRequest.requestUpdates.length + 1}.md`,
            content: prBody,
            commitMessage: `Add README for ${newBranch}`,
            branch: newBranch,
        });
        dataStream.writeData({
            type: "status",
            status: "creating new pull request based on " + clientRequest.prNumber,
        });
        // Create a new pull request.
        const prResult = await appRepoSdk.createPullRequest({
            title: `Reopen PR for Client Request #${lastRequestPrNumber || clientRequest.prNumber}: ${clientRequest.title}`,
            head: newBranch,
            base: clientRequest.prTargetBranch,
            body: prBody,
        });
        if (!prResult) {
            throw new Error("Failed to reopen PR");
        }
        dataStream.writeData({
            type: "status",
            status: "saving PR update",
        });
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
        dataStream.writeData({
            type: "status",
            status: "updating client request",
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
        dataStream.writeData({
            type: "status",
            status: "updating client request file in repo!",
        });
        await appRepoSdk.updateFile({
            path: clientRequestFilePath,
            content: JSON.stringify(updatedClientRequestData, null, 2),
            commitMessage: `Updated clientRequest.json`,
            branch: newBranch,
        });
        // // Refresh client request updates.
        // await updateClientRequest(clientRequest);
        dataStream.writeData({
            type: "log",
            status: "storing to history",
        });
        await prisma.chatUIMessage.create({
            data: {
                originClientRequestId,
                userId,
                content: content,
                metadata: {
                    media: mediaPayload,
                },
                context: context || "server",
                role: "user",
                minionType: "other",
                createdAt: initTime,
                updatedAt: initTime,
            },
        });
        dataStream.writeMessageAnnotation({
            id: crypto.randomUUID(),
            type: "system",
            content: `Your request has been reopened. We'll get back to you soon.`,
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
        dataStream.writeData({
            type: "log",
            status: "sending slack message",
        });
        const slackMsg = `A request with title: *${clientRequest.title}* has been reopened with message: ${content}. [View PR](${prResult.html_url})`;
        await slackBotSdk.sendSlackMessageviaAPI({
            text: slackMsg,
            channel: process.env.NODE_ENV === "production"
                ? SlackChannels.p_3_custombots
                : SlackChannels.test_slackbot,
        });
    }
    else {
        dataStream.writeData({
            type: "status",
            status: "creating comment on PR",
        });
        // Normal case: add a comment to the PR with media preview.
        const commentBody = `<Not for Client> Msg from Client: ${content}${mediaMarkdown}`;
        await appRepoSdk.createCommentOnPr(lastRequestPrNumber || clientRequest.prNumber, commentBody);
        // await updateClientRequest(clientRequest);
        dataStream.writeData({
            type: "log",
            status: "creating chat ui message",
        });
        await prisma.chatUIMessage.create({
            data: {
                originClientRequestId,
                userId,
                content: content,
                metadata: {
                    media: mediaPayload,
                },
                context: "chat",
                role: "user",
                minionType: "other",
                createdAt: initTime,
                updatedAt: initTime,
            },
        });
    }
    return {
        responseBody,
        appendRequestBody: requestBody,
    };
};
