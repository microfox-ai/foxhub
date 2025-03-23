// api/client-secrets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { TEMPLATE_REPO_OWNER, GITHUB_TOKEN } from "@/utils/constants/githubInfo";
import { GithubSdk } from "@/utils/services/githubSdk";

// Create ClientSecret
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botProjectId, userId, type, variables, clientRequestId, name } =
      body;

    console.log("body", body);

    if (!botProjectId || !userId || !type || !variables || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the ClientSecret without a mode field (since it's not part of the schema)
    const clientSecret = await prisma.clientSecret.create({
      data: {
        botProjectId,
        userId,
        type,
        variables,
        name,
        clientRequestIds: [clientRequestId],
      },
    });

    // If an originClientRequestId is provided, update that ClientRequest to add the new bot's id
    if (clientRequestId) {
      const clientRequest = await prisma.clientRequest.update({
        where: { id: clientRequestId },
        data: {
          mentionedClientSecretIds: {
            push: clientSecret.id,
          },
        },
        include: {
          requestUpdates: true,
        },
      });

      if (!GITHUB_TOKEN) {
        console.error("No GitHub token provided");
        return NextResponse.json(
          { error: "GitHub token missing" },
          { status: 500 }
        );
      }

      const repoName = clientRequest?.prUrl?.split("/")[4];

      if (!repoName) {
        console.error("No repo name found");
        return NextResponse.json(
          { error: "Repo name missing" },
          { status: 500 }
        );
      }

      const appRepoSdk = new GithubSdk({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoName,
        token: GITHUB_TOKEN,
      });

      const requestUpdates = clientRequest.requestUpdates;

      // Find the update with the largest prNumber.
      const lastRequestPrNumber =
        requestUpdates.length > 0
          ? requestUpdates.reduce((acc, curr) =>
              acc.prNumber > curr.prNumber ? acc : curr
            ).prNumber
          : null;

      const modeMap = clientSecret.variables.reduce(
        (acc: Record<string, string[]>, variable: any) => {
          if (
            variable.mode &&
            Array.isArray(variable.mode) &&
            variable.mode.length > 0
          ) {
            variable.mode.forEach((mode: string) => {
              acc[mode] = acc[mode] || [];
              acc[mode].push(variable.key);
            });
          }
          return acc;
        },
        {}
      );

      // Format as markdown for GitHub PR comment
      const modeMapString = Object.entries(modeMap)
        .map(([mode, keys]) => `- **${mode}**: ${keys.join(", ")}`)
        .join("\n");

      const commentBody = `<Not for Client> **Client has added a new bot to their request:**  
**Bot Name:** ${clientSecret.name}  
**Environment Variables:**  
${modeMapString}`;

      await appRepoSdk.createCommentOnPr(
        lastRequestPrNumber || clientRequest.prNumber || 0,
        commentBody
      );

      const variablesKeyString = variables
        .map((variable: any) => variable.key)
        .join(", ");

      await prisma.chatUIMessage.create({
        data: {
          originClientRequestId: clientRequest.id,
          userId,
          content: `${name} bot has been added to your request with the following variables: ${variablesKeyString}.`,
          context: "chat",
          role: "sysUpdate",
          minionType: "other",
        },
      });
    }
    return NextResponse.json(clientSecret, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating ClientSecret" },
      { status: 500 }
    );
  }
}

// Get ClientSecret
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const botProjectId = searchParams.get("botProjectId");
    const clientRequestId = searchParams.get("clientRequestId");
    console.log(id, userId, clientRequestId);

    if (clientRequestId) {
      const clientRequest = await prisma.clientRequest.findUnique({
        where: { id: clientRequestId },
      });
      if (!clientRequest)
        return NextResponse.json(
          { error: "ClientRequest not found" },
          { status: 404 }
        );

      if (!clientRequest.mentionedClientSecretIds) {
        await prisma.clientRequest.update({
          where: { id: clientRequestId },
          data: {
            mentionedClientSecretIds: {
              set: [],
            },
          },
        });
        return NextResponse.json({ clientSecrets: [] }, { status: 200 });
      }

      const mentionedClientSecrets = await Promise.all(
        clientRequest.mentionedClientSecretIds.map(async (id) => {
          const clientSecret = prisma.clientSecret.findUnique({
            where: { id },
          });
          return clientSecret;
        })
      );
      return NextResponse.json(
        { clientSecrets: mentionedClientSecrets },
        { status: 200 }
      );
    }
    if (botProjectId) {
      const clientSecrets = await prisma.clientSecret.findMany({
        where: { botProjectId },
      });
      return NextResponse.json({ clientSecrets }, { status: 200 });
    }
    if (userId) {
      const clientSecrets = await prisma.clientSecret.findMany({
        where: { userId },
      });
      return NextResponse.json({ clientSecrets }, { status: 200 });
    }
    if (id) {
      const clientSecret = await prisma.clientSecret.findUnique({
        where: { id },
      });
      return NextResponse.json(
        { clientSecrets: [clientSecret] },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Missing id or userId or clientRequestId" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching ClientSecret" },
      { status: 500 }
    );
  }
}

// Update ClientSecret
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, variables, clientRequestId } = body;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const clientSecret = await prisma.clientSecret.findUnique({
      where: { id },
    });
    if (!clientSecret)
      return NextResponse.json(
        { error: "ClientSecret not found" },
        { status: 404 }
      );

    let updatedBot;

    // If clientRequestId is provided and not already in the array, add it
    if (
      clientRequestId &&
      !clientSecret.clientRequestIds.includes(clientRequestId)
    ) {
      // Add bot to client request
      const clientRequest = await prisma.clientRequest.update({
        where: { id: clientRequestId },
        data: {
          mentionedClientSecretIds: {
            push: id,
          },
        },
        include: {
          requestUpdates: true,
        },
      });

      // Add client request to bot
      updatedBot = await prisma.clientSecret.update({
        where: { id },
        data: {
          clientRequestIds: {
            push: clientRequestId,
          },
          ...(variables ? { variables } : {}),
        },
      });

      // Add comment to GitHub PR if available
      const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
      if (TMD_GITHUB_TOKEN && clientRequest.prUrl) {
        // Create formatted string of variables with modes
        // Group variables by mode
        const modeMap: Record<string, string[]> = {};

        clientSecret.variables.forEach((variable: any) => {
          const key = variable.key;

          if (
            variable.mode &&
            Array.isArray(variable.mode) &&
            variable.mode.length > 0
          ) {
            // Add the key to each mode's array
            variable.mode.forEach((mode: string) => {
              if (!modeMap[mode]) {
                modeMap[mode] = [];
              }
              modeMap[mode].push(key);
            });
          } else {
            // Handle variables without mode
            if (!modeMap["default"]) {
              modeMap["default"] = [];
            }
            modeMap["default"].push(key);
          }
        });

        const repoName = clientRequest?.prUrl?.split("/")[4];

        if (!repoName) {
          console.error("No repo name found");
          return NextResponse.json(
            { error: "Repo name missing" },
            { status: 500 }
          );
        }

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
                acc.prNumber > curr.prNumber ? acc : curr
              ).prNumber
            : null;

        const modeMapString = Object.entries(modeMap)
          .map(([mode, keys]) => `- **${mode}**: ${keys.join(", ")}`)
          .join("\n");

        const commentBody = `<Not for Client> **Client has added their bot in this request:**  
**Bot Name:** ${clientSecret.name}  
**Updated Environment Variables:**  
${modeMapString}`;

        await appRepoSdk.createCommentOnPr(
          lastRequestPrNumber || clientRequest.prNumber || 0,
          commentBody
        );

        // Create a simple key string without modes for client-facing message
        const variablesKeyString = clientSecret.variables
          .map((variable: any) => variable.key)
          .join(", ");

        await prisma.chatUIMessage.create({
          data: {
            originClientRequestId: clientRequest.id,
            userId: clientSecret.userId,
            content: `${clientSecret.name} bot has been added to this request with the following variables: ${variablesKeyString}.`,
            context: "chat",
            role: "sysUpdate",
            minionType: "other",
          },
        });
      }
    } else {
      // Just update variables if clientRequestId not provided or already exists
      updatedBot = await prisma.clientSecret.update({
        where: { id },
        data: { variables: variables || clientSecret.variables },
      });
    }

    return NextResponse.json(updatedBot, { status: 200 });
  } catch (error) {
    console.error("Error updating ClientSecret:", error);
    return NextResponse.json(
      { error: "Error updating ClientSecret" },
      { status: 500 }
    );
  }
}

// Delete ClientSecret or remove bot from client request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientRequestId = searchParams.get("clientRequestId");
    const removeOnly = searchParams.get("removeOnly") === "true";

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const clientSecret = await prisma.clientSecret.findUnique({
      where: { id },
    });
    if (!clientSecret)
      return NextResponse.json(
        { error: "ClientSecret not found" },
        { status: 404 }
      );

    // If clientRequestId is provided and removeOnly is true, just remove the association
    if (clientRequestId && removeOnly) {
      // Remove clientRequestId from the bot's clientRequestIds array
      await prisma.clientSecret.update({
        where: { id },
        data: {
          clientRequestIds: {
            set: clientSecret.clientRequestIds.filter(
              (reqId) => reqId !== clientRequestId
            ),
          },
        },
      });

      // Remove botId from the clientRequest's mentionedClientSecretIds array
      const clientRequest = await prisma.clientRequest.findUnique({
        where: { id: clientRequestId },
        include: {
          requestUpdates: true,
        },
      });

      if (clientRequest) {
        await prisma.clientRequest.update({
          where: { id: clientRequestId },
          data: {
            mentionedClientSecretIds: {
              set: clientRequest.mentionedClientSecretIds.filter(
                (botId) => botId !== id
              ),
            },
          },
        });

        // Add a message to notify that the key was removed
        await prisma.chatUIMessage.create({
          data: {
            originClientRequestId: clientRequestId,
            userId: clientSecret.userId,
            content: `${clientSecret.name} with keys ${clientSecret.variables.map((variable: any) => variable.key).join(", ")} has been removed from this request.`,
            context: "chat",
            role: "sysUpdate",
            minionType: "other",
          },
        });

        // Add a comment to GitHub PR if available
        const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
        if (TMD_GITHUB_TOKEN && clientRequest.prUrl) {
          const repoName = clientRequest?.prUrl?.split("/")[4];

          if (!repoName) {
            console.error("No repo name found");
            return NextResponse.json(
              { error: "Repo name missing" },
              { status: 500 }
            );
          }
          const appRepoSdk = new GithubSdk({
            owner: TEMPLATE_REPO_OWNER,
            repo: repoName,
            token: TMD_GITHUB_TOKEN,
          });

          const requestUpdates = clientRequest.requestUpdates;

          // Find the update with the largest prNumber
          const lastRequestPrNumber =
            requestUpdates.length > 0
              ? requestUpdates.reduce((acc, curr) =>
                  acc.prNumber > curr.prNumber ? acc : curr
                ).prNumber
              : null;

          const modeMap = clientSecret.variables.reduce(
            (acc: Record<string, string[]>, variable: any) => {
              if (
                variable.mode &&
                Array.isArray(variable.mode) &&
                variable.mode.length > 0
              ) {
                variable.mode.forEach((mode: string) => {
                  acc[mode] = acc[mode] || [];
                  acc[mode].push(variable.key);
                });
              }
              return acc;
            },
            {}
          );

          // Format the modeMap into a markdown-friendly string for GitHub comment
          const modeMapString = Object.entries(modeMap)
            .map(([mode, keys]) => `- **${mode}**: ${keys.join(", ")}`)
            .join("\n");

          const commentBody = `<Not for Client> **Client has removed the following bot from their request:**  
**Bot Name:** ${clientSecret.name}  
**Environment Variables:**  
${modeMapString}`;

          await appRepoSdk.createCommentOnPr(
            lastRequestPrNumber || clientRequest.prNumber || 0,
            commentBody
          );
        }
      }

      return NextResponse.json(
        { message: "Bot removed from request successfully" },
        { status: 200 }
      );
    }
    // Otherwise, delete the bot entirely
    else {
      // First remove the bot from all client requests it's associated with
      await Promise.all(
        clientSecret.clientRequestIds.map(async (reqId) => {
          const clientRequest = await prisma.clientRequest.findUnique({
            where: { id: reqId },
          });
          if (clientRequest) {
            await prisma.clientRequest.update({
              where: { id: reqId },
              data: {
                mentionedClientSecretIds: {
                  set: clientRequest.mentionedClientSecretIds.filter(
                    (botId) => botId !== id
                  ),
                },
              },
            });
          }
        })
      );

      // Then delete the bot
      await prisma.clientSecret.delete({ where: { id } });

      return NextResponse.json(
        { message: "Bot deleted successfully" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error handling ClientSecret deletion:", error);
    return NextResponse.json(
      { error: "Error processing delete operation" },
      { status: 500 }
    );
  }
}
