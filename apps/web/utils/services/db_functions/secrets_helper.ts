import { prisma } from "@/prisma/prisma";
import { ClientDeploymentMetadata, ClientSecretVariable } from "@/server/types";
import { ClientSecret } from "@prisma/client";
import { updateLambdaEnvironmentVariables } from "../aws/aws_helper";

// RULE 1 - CLIENT SECRETS ARE SCOPED TO BOT PROJECTS
// RULE 2 - 1 CLIENT SECRET CAN BE USED IN MULTIPLE CLIENT REQUESTS & VICE VERCA (Many-to-Many)
// RULE 3 - 1 CLIENT SECRET CAN BE USED IN MULTIPLE CLIENT DEPLOYMENTS (Many-to-Many)
// RULE 4 - 1 PROJECT MIGHT HAVE MULTIPLE CLIENT SECRETS OF THE SAME TYPE
// RULE 5 - CLIENTSECRETSTATUS.EMPTY means ITs a wasted Document (untill it becomes filled), do not use it anywhere, ignore it by default

/**
 * 1. createClientSecret - Creates a new client secret
 * 2. updateClientSecret - Updates an existing client secret
 * 3. createOrUpdateClientRequest - Creates or updates a client secret based on request
 * 4. updateEnvironmentVariablesInClientSecret - Updates environment variables in a client secret
 * 5. updateBotConfigVariablesInClientSecret - Updates bot configuration variables in a client secret
 * 6. deleteClientSecret - Deletes a client secret
 * 7. addClientSecretToClientRequest - Associates a client secret with a client request
 * 8. removeClientSecretFromClientRequest - Removes a client secret from a client request
 */

/**
 *
 * status - EMPTY (when initiating oauth2), later switched to FILLED (when oauth2 is completed)
 * packageType - CUSTOM (when creating a custom secret), OAUTH2 (when creating an oauth2 secret), API_KEY (when creating an api key secret), TEMPLATE (when creating a template secret)
 */

export const clientSecretExists = async (
  botProjectId: string,
  requestId: string,
  type: string
) => {
  if (type === "custom" || type === "template") {
    const clientSecret = await prisma.clientSecret.findFirst({
      where: { botProjectId, type, clientRequestIds: { has: requestId } },
    });
    return clientSecret;
  } else {
    const clientSecret = await prisma.clientSecret.findFirst({
      where: { botProjectId, type },
    });
    return clientSecret;
  }
};

export const clientSecretExistsInProject = async (
  botProjectId: string,
  type: string
) => {
  const clientSecret = await prisma.clientSecret.findFirst({
    where: { botProjectId, type },
  });
  return clientSecret;
};

export const clientSecretExistsInRequest = async (
  clientRequestId: string,
  botProjectId: string,
  type: string
) => {
  const clientSecret = await prisma.clientSecret.findFirst({
    where: { clientRequestIds: { has: clientRequestId }, botProjectId, type },
  });
  return clientSecret;
};

export const createNewClientSecret = async (
  _clientSecret: Omit<ClientSecret, "id" | "createdAt" | "updatedAt" | "type">
) => {
  const { botProjectId, userId, variables } = _clientSecret;

  if (!botProjectId || !userId || !variables) {
    throw new Error("Missing required fields");
  }

  try {
    // Create a new clientSecret in the database
    const clientSecret = await prisma.clientSecret.create({
      data: {
        ...(_clientSecret as any),
        botProjectId,
        userId,
        type:
          _clientSecret.packageType === "custom"
            ? "custom"
            : _clientSecret.packageName +
              "/" +
              _clientSecret.packageConstructor,
        clientRequestIds: _clientSecret.clientRequestIds ?? [],
        clientDeploymentIds: _clientSecret.clientDeploymentIds ?? [],
      },
    });

    return clientSecret;
  } catch (error) {
    console.error("Error creating client secret", error);
    throw new Error("Error creating client secret");
  }
};

export const updateClientSecret = async (
  clientSecretId: string,
  _clientSecret: Partial<ClientSecret>
) => {
  const clientSecret = await prisma.clientSecret.update({
    where: { id: clientSecretId },
    data: _clientSecret as any,
  });
  return clientSecret;
};

export const addClientSecretToClientRequest = async (
  clientSecretId: string,
  clientRequestId: string
) => {
  let updatedClientSecret = null;
  let updatedClientRequest = null;

  // Find the client secret by ID
  const clientSecret = await prisma.clientSecret.findUnique({
    where: { id: clientSecretId },
  });

  // Add the client request ID to the client secret if it's not already included
  if (!clientSecret?.clientRequestIds.includes(clientRequestId)) {
    updatedClientSecret = await prisma.clientSecret.update({
      where: { id: clientSecretId },
      data: { clientRequestIds: { push: clientRequestId } },
    });
  }

  // Find the client request by ID
  const clientRequest = await prisma.clientRequest.findUnique({
    where: { id: clientRequestId },
  });

  // Add the client secret ID to the client request if it's not already included
  if (!clientRequest?.mentionedClientSecretIds.includes(clientSecretId)) {
    updatedClientRequest = await prisma.clientRequest.update({
      where: { id: clientRequestId },
      data: { mentionedClientSecretIds: { push: clientSecretId } },
    });
  }

  return {
    clientSecret: updatedClientSecret,
    clientRequest: updatedClientRequest,
  };
};

export const removeClientSecretFromClientRequest = async (
  clientSecretId: string,
  clientRequestId: string
) => {
  let updatedClientSecret = null;
  let updatedClientRequest = null;

  // Find the client secret by ID
  const clientSecret = await prisma.clientSecret.findUnique({
    where: { id: clientSecretId },
  });

  // Remove the client request ID from the client secret if it's included
  if (clientSecret?.clientRequestIds.includes(clientRequestId)) {
    updatedClientSecret = await prisma.clientSecret.update({
      where: { id: clientSecretId },
      data: {
        clientRequestIds: clientSecret.clientRequestIds.filter(
          (id) => id !== clientRequestId
        ),
      },
    });
  }

  // Find the client request by ID
  const clientRequest = await prisma.clientRequest.findUnique({
    where: { id: clientRequestId },
  });

  // Remove the client secret ID from the client request if it's included
  if (clientRequest?.mentionedClientSecretIds.includes(clientSecretId)) {
    updatedClientRequest = await prisma.clientRequest.update({
      where: { id: clientRequestId },
      data: {
        mentionedClientSecretIds: clientRequest.mentionedClientSecretIds.filter(
          (id) => id !== clientSecretId
        ),
      },
    });
  }

  return {
    clientSecret: updatedClientSecret,
    clientRequest: updatedClientRequest,
  };
};

export const addClientSecretToClientDeployment = async (
  clientSecretId: string,
  clientDeploymentId: string
) => {
  let updatedClientSecret = null;
  let updatedClientDeployment = null;

  const clientSecret = await prisma.clientSecret.findUnique({
    where: { id: clientSecretId },
  });
  if (!clientSecret?.clientDeploymentIds.includes(clientDeploymentId)) {
    updatedClientSecret = await prisma.clientSecret.update({
      where: { id: clientSecretId },
      data: { clientDeploymentIds: { push: clientDeploymentId } },
    });
  }

  const clientDeployment = await prisma.clientDeployment.findUnique({
    where: { id: clientDeploymentId },
  });

  if (!clientDeployment?.clientSecretIds.includes(clientSecretId)) {
    updatedClientDeployment = await prisma.clientDeployment.update({
      where: { id: clientDeploymentId },
      data: { clientSecretIds: { push: clientSecretId } },
    });
  }

  return {
    clientSecret: updatedClientSecret,
    clientDeployment: updatedClientDeployment,
  };
};

export const removeClientSecretFromClientDeployment = async (
  clientSecretId: string,
  clientDeploymentId: string
) => {
  let updatedClientSecret = null;
  let updatedClientDeployment = null;

  const clientSecret = await prisma.clientSecret.findUnique({
    where: { id: clientSecretId },
  });

  if (clientSecret?.clientDeploymentIds.includes(clientDeploymentId)) {
    updatedClientSecret = await prisma.clientSecret.update({
      where: { id: clientSecretId },
      data: {
        clientDeploymentIds: clientSecret.clientDeploymentIds.filter(
          (id) => id !== clientDeploymentId
        ),
      },
    });
  }

  const clientDeployment = await prisma.clientDeployment.findUnique({
    where: { id: clientDeploymentId },
  });

  if (clientDeployment?.clientSecretIds.includes(clientSecretId)) {
    updatedClientDeployment = await prisma.clientDeployment.update({
      where: { id: clientDeploymentId },
      data: {
        clientSecretIds: clientDeployment.clientSecretIds.filter(
          (id) => id !== clientSecretId
        ),
      },
    });
  }

  return {
    clientSecret: updatedClientSecret,
    clientDeployment: updatedClientDeployment,
  };
};

export const createOrUpdateClientSecret = async (
  clientRequestId: string,
  _clientSecret: ClientSecret,
  mustCreateNewClientSecret?: boolean
) => {
  const { botProjectId, userId, type, variables, name, status } = _clientSecret;

  if (!botProjectId || !userId || !type || !variables || !clientRequestId) {
    throw new Error("Missing required fields");
  }

  // For a particular botProjectId, if the clientSecret already exists,
  // push this clientRequestId to the clientSecret.clientRequestIds array
  let existingClientSecret;

  if (type !== "custom") {
    if (!mustCreateNewClientSecret) {
      // Fetch from the bot-project-id
      // If the bot project has multiple clientSecrets, it's an issue -
      // as there is no reason client secrets are unique
      // Maybe these variables are new instance the client wanted.
      // This entire existing loop might be wrong
      existingClientSecret = await prisma.clientSecret.findFirst({
        where: {
          botProjectId,
          type,
        },
      });
    }
  } else {
    // Fetch from the clientRequestId (because custom secrets are created per request)
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
    // Update the existing clientSecret
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
    // Create a new clientSecret
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

  // If a clientRequestId is provided, update that ClientRequest to add the new secret's id
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

    return clientSecret;
  }
};

export const updateClientSecretVariablesInDeployments = async (
  clientSecrets: ClientSecret[]
) => {
  for (const clientSecret of clientSecrets) {
    const clientDeployments = await prisma.clientDeployment.findMany({
      where: {
        clientSecretIds: {
          has: clientSecret.id,
        },
      },
    });
    for (const clientDeployment of clientDeployments) {
      const secretsInDeployment = await prisma.clientSecret.findMany({
        where: {
          clientDeploymentIds: {
            has: clientDeployment.id,
          },
        },
      });
      const envVars: any = {};
      secretsInDeployment.forEach((secret) =>
        (secret.variables as any[])?.forEach((v) => {
          envVars[v.key] = v.value;
        })
      );
      await updateLambdaEnvironmentVariables({
        functionName: clientDeployment.name,
        environmentVariables: envVars,
        region: "us-east-1",
      });
    }
  }
};

export const updateDeploymentsOfClientSecret = async (
  clientSecret?: ClientSecret | null,
  onlyRequestIds?: string[]
) => {
  if (clientSecret && clientSecret?.variables?.length > 0) {
    const clientDeployments = await prisma.clientDeployment.findMany({
      where: {
        originClientRequestId: {
          in: onlyRequestIds ?? clientSecret?.clientRequestIds,
        },
      },
    });

    for (const deployment of clientDeployments) {
      const serverlessMetadata = (
        deployment?.metadata as unknown as ClientDeploymentMetadata
      )?.serverless;
      if (!serverlessMetadata) {
        continue;
      }
      for (const functionInfo of serverlessMetadata?.functions ?? []) {
        let envVarsmap =
          clientSecret?.variables?.reduce(
            (acc: Record<string, string>, curr: any) => {
              acc[curr.key] = curr.value;
              return acc;
            },
            {}
          ) ?? {};
        if (clientSecret?.botConfig) {
          (clientSecret?.botConfig as any[]).forEach(
            (config: ClientSecretVariable) => {
              if (config.value) {
                envVarsmap[config.key] = config.value;
              }
            }
          );
        }
        try {
          await updateLambdaEnvironmentVariables({
            functionName:
              serverlessMetadata?.functionBase?.toLowerCase() +
              "-" +
              functionInfo.functionName,
            region: "us-east-1",
            environmentVariables: envVarsmap,
          });
        } catch (error) {
          console.error("Error updating lambda environment variables", error);
        }
      }
    }
  }
};
