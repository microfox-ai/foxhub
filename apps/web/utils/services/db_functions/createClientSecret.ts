import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { ClientSecret } from "@prisma/client";
import { GithubSdk } from "../githubSdk";

export interface ClientSecreVariable {
  mode: Array<"DEV" | "PROD" | "STAGING">;
  key: string;
  value: string;
  isOptional: boolean;
}

export const createClientSecret = async (_clientSecret: {
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
  const clientSecret = await prisma.clientSecret.create({
    data: {
      botProjectId,
      userId,
      type,
      variables: variables as any,
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

    const commentBody = `<Not for Client> **Client has added a new secret to their request:**  
**Secret Name:** ${clientSecret.name}  
**Environment Variables:**  
${modeMapString}`;

    await appRepoSdk.createCommentOnPr(
      lastRequestPrNumber || clientRequest.prNumber || 0,
      commentBody
    );

    return clientSecret;
  }
};
