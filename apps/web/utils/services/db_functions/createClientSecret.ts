import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { CLIENTSECRETSTATUS } from "@prisma/client";
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
  status?: CLIENTSECRETSTATUS;
  mustCreateNewClientSecret?: boolean;
}) => {
  const {
    botProjectId,
    userId,
    type,
    variables,
    clientRequestId,
    name,
    status,
  } = _clientSecret;
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
    if (!_clientSecret.mustCreateNewClientSecret) {
      // fetch from the bot-project-id
      // fi the bot project has multiple clientSecrets, ITS AN ISSUE - as there is no reason client secrets are unique
      // maybe theese variables are new instance the client wanted. this entire existing loop might be wrong
      existingClientSecret = await prisma.clientSecret.findFirst({
        where: {
          botProjectId,
          type,
        },
      });
    }
  } else {
    // fetch from the clientRequestId (because custom secrets are created per request)
    existingClientSecret = await prisma.clientSecret.findFirst({
      where: {
        botProjectId,
        type,
        clientRequestIds: {
          has: clientRequestId,
        },
      },
    });
  }

  console.log("existingClientSecret", existingClientSecret);

  let clientSecret;

  if (existingClientSecret) {
    // update the existing clientSecret
    clientSecret = await prisma.clientSecret.update({
      where: { id: existingClientSecret.id },
      data: {
        status,
        variables: variables as any,
        clientRequestIds: existingClientSecret.clientRequestIds.includes(
          clientRequestId
        )
          ? undefined
          : { push: clientRequestId },
      },
    });
  } else {
    console.log("creating a new clientSecret");
    // create a new clientSecret
    clientSecret = await prisma.clientSecret.create({
      data: {
        botProjectId,
        userId,
        type,
        variables: variables as any,
        name,
        clientRequestIds: [clientRequestId],
        status,
      },
    });
  }

  // If an clientRequestId is provided, update that ClientRequest to add the new bot's id
  if (clientRequestId) {
    // First fetch the client request to check if the ID already exists
    const existingClientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
    });

    if (!existingClientRequest) {
      throw new Error(`Client request with ID ${clientRequestId} not found`);
    }

    // Then update it, only pushing the ID if it doesn't already exist
    const clientRequest = await prisma.clientRequest.update({
      where: { id: clientRequestId },
      data: {
        mentionedClientSecretIds:
          existingClientRequest.mentionedClientSecretIds.includes(
            clientSecret.id
          )
            ? undefined
            : { push: clientSecret.id },
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
