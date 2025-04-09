import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { ClientSecret } from "@prisma/client";
import { GithubSdk } from "../githubSdk";

export interface ClientSecreVariable {
  mode?: Array<"DEV" | "PROD" | "STAGING">;
  key: string;
  value: string;
  isOptional: boolean;
}

export const createOrUpdateClientSecret = async (_clientSecret: {
  botProjectId?: string;
  userId?: string;
  type: string;
  variables: ClientSecreVariable[];
  name: string;
  clientRequestId?: string;
}) => {
  const { botProjectId, userId, type, variables, clientRequestId, name } =
    _clientSecret;
  if (
    !botProjectId ||
    !userId ||
    !type ||
    !variables ||
    !name ||
    !clientRequestId
  ) {
    throw new Error("Missing required fields");
  }

  // Create the ClientSecret without a mode field (since it's not part of the schema)

  // for a particular botProjectId, if the clientSecret alreay exists, push this clientRequestId to the clientSecret.clientRequestIds array
  let existingClientSecret;

  if (type !== "custom") {
    // fetch from the bot-project-id
    existingClientSecret = await prisma.clientSecret.findFirst({
      where: {
        botProjectId,
        type,
      },
    });
  } else {
    // fetch from the clientRequestId (because custom secrets are created per request)
    existingClientSecret = await prisma.clientSecret.findFirst({
      where: {
        botProjectId,
        name,
        clientRequestIds: {
          has: clientRequestId,
        },
      },
    });
  }

  let clientSecret;

  if (existingClientSecret) {
    // update the existing clientSecret
    clientSecret = await prisma.clientSecret.update({
      where: { id: existingClientSecret.id },
      data: {
        variables: variables as any,
        clientRequestIds: { push: clientRequestId },
      },
    });
  } else {
    // create a new clientSecret
    clientSecret = await prisma.clientSecret.create({
      data: {
        botProjectId,
        userId,
        type,
        variables: variables as any,
        name,
        clientRequestIds: [clientRequestId],
      },
    });
  }

  // If an clientRequestId is provided, update that ClientRequest to add the new bot's id
  if (clientRequestId) {
    const clientRequest = await prisma.clientRequest.update({
      where: { id: clientRequestId },
      data: {
        mentionedClientSecretIds: {
          push: clientSecret.id,
        },
      },
    });

    if (!GITHUB_TOKEN) {
      throw new Error("No GitHub token provided");
    }

    const repoName = clientRequest?.repoName;

    if (!repoName) {
      throw new Error("No repo name found");
    }

    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: repoName,
      token: GITHUB_TOKEN,
    });

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

    const commentBody = `<Not for Client> **Client has added a new secret to their request:**  
**Secret Name:** ${clientSecret.name}  
**Environment Variables:**  
${modeMapString}`;

    await appRepoSdk.createCommentOnPr(
      clientRequest.prNumber || 0,
      commentBody
    );

    return clientSecret;
  }
};
