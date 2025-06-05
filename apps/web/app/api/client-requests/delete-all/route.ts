import { prisma } from "@/prisma/prisma";
import { fetchTemplateDir } from "@/server/buildfox/tool/writeToFile";
import { TaskStructure } from "@/server/convertfox/types";
import { triggerDeployment } from "@/server/deployfox/deployGit";
import { DEPLOY_STAGE, REQUESTSTATUS } from "@prisma/client";
import { readFile } from "fs/promises";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";
import { Redis } from "@upstash/redis";
import { ClientSecretPackageType } from "@/server/types";
import { removeClientSecretFromClientRequest } from "@/utils/services/db_functions/secrets_helper";
import { closePullRequest } from "@/utils/services/github_functions/deleteRepo";
import { deleteEmbedding } from "@/utils/services/embeddings/embedFunctions";

export const maxDuration = 300;

// Delete Serverless Function Deployment
// No need to delete the document, as it will be deleted from inside the function.
// TODO: directly delete the aws landa function based on the details in the clientDeployment document (it should have all necessary info - check client-secrets/update-deployments).
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log("id", id);
    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    let deleteResponse: any = {};

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: id },
    });

    const clientFunction = await prisma.clientDeployment.findFirst({
      where: { originClientRequestId: id },
    });

    const taskInstanceMeta = await prisma.taskInstanceMeta.findFirst({
      where: {
        originClientRequestId: id,
      },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }

    // 1. delete the deployment
    try {
      if (clientFunction && clientFunction.stage) {
        const { sha } = await triggerDeployment(
          clientRequest,
          clientFunction.stage,
          true,
          undefined
        );
        const embeddingDeleteResponse = await deleteEmbedding(
          clientFunction.originClientRequestId
        );
        deleteResponse.deployment = {
          deletingCommitSha: sha,
          embeddingsDeleted: embeddingDeleteResponse.success,
        };
      }
    } catch (error) {
      console.error("Error deleting deployment:", error);
      return NextResponse.json(
        { error: "Error deleting deployment" },
        { status: 500 }
      );
    }

    // 2. delete the db stuff.
    try {
      if (taskInstanceMeta?.taskStructure) {
        const template_type = (
          taskInstanceMeta?.taskStructure as any as TaskStructure
        ).templateType;
        const envsJSON = await readFile(
          path.join(
            process.cwd(),
            fetchTemplateDir(template_type),
            "envs.json"
          ),
          "utf8"
        );
        let templatedEnvs = JSON.parse(envsJSON);
        const upstashUrl = templatedEnvs.find((env: any) =>
          env.key.includes("UPSTASH_REDIS_REST_URL")
        )?.value;
        const upstashToken = templatedEnvs.find((env: any) =>
          env.key.includes("UPSTASH_REDIS_REST_TOKEN")
        )?.value;
        if (upstashUrl && upstashToken) {
          const redisClient = new Redis({
            url: upstashUrl,
            token: upstashToken,
          });
          // Delete all Redis keys matching the pattern ${id}*
          const keys = await redisClient.keys(`${id}*`);
          if (keys.length > 0) {
            await redisClient.del(...keys);
          }

          deleteResponse.redis = {
            totalKeysDeleted: keys.length,
            deletedKeys: keys,
          };
        }
      }
    } catch (error) {
      console.error("Error deleting Redis keys:", error);
      return NextResponse.json(
        { error: "Error deleting Redis keys" },
        { status: 500 }
      );
    }

    // 3. delete the custom envs & template envs for this client request.
    try {
      const deletedCustomSecrets = await prisma.clientSecret.deleteMany({
        where: {
          clientRequestIds: {
            has: id,
          },
          packageType: ClientSecretPackageType.CUSTOM,
        },
      });

      const deletInternalTemplateSecrets = await prisma.clientSecret.deleteMany(
        {
          where: {
            clientRequestIds: {
              has: id,
            },
            packageType: ClientSecretPackageType.TEMPLATE,
          },
        }
      );

      const linkedOauthSecrets = await prisma.clientSecret.findMany({
        where: {
          clientRequestIds: {
            has: id,
          },
          packageType: ClientSecretPackageType.OAUTH2,
        },
      });

      await Promise.all(
        linkedOauthSecrets.map(async (secret) => {
          if (secret.clientRequestIds.length > 1) {
            await prisma.clientSecret.update({
              where: {
                id: secret.id,
              },
              data: {
                clientRequestIds: secret.clientRequestIds.filter(
                  (id) => id !== id
                ),
              },
            });
          } else {
            await prisma.clientSecret.delete({
              where: {
                id: secret.id,
              },
            });
          }
        })
      );

      const linkedApiKeySecrets = await prisma.clientSecret.findMany({
        where: {
          clientRequestIds: {
            has: id,
          },
          packageType: ClientSecretPackageType.APIKEY,
        },
      });

      await Promise.all(
        linkedApiKeySecrets.map(async (secret) => {
          await prisma.clientSecret.update({
            where: {
              id: secret.id,
            },
            data: {
              clientRequestIds: secret.clientRequestIds.filter(
                (id) => id !== id
              ),
            },
          });
        })
      );

      deleteResponse.customSecrets = {
        customSecretsDeleted: deletedCustomSecrets.count,
        internalTemplateSecretsDeleted: deletInternalTemplateSecrets.count,
        linkedSecretsDeleted: linkedOauthSecrets.filter(
          (secret) => secret.clientRequestIds.length === 1
        ).length,
        linkedSecretsUnlinked: linkedOauthSecrets.filter(
          (secret) => secret.clientRequestIds.length > 1
        ).length,
      };
    } catch (error) {
      console.error("Error deleting custom secrets:", error);
      return NextResponse.json(
        { error: "Error deleting custom secrets" },
        { status: 500 }
      );
    }

    // 4. Delete chat messages & taskIsntanceMeta
    try {
      const deletedChatMessages = await prisma.chatUIMessage.deleteMany({
        where: {
          originClientRequestId: id,
        },
      });

      const deletedTaskInstanceMeta = await prisma.taskInstanceMeta.delete({
        where: {
          originClientRequestId: id,
        },
      });

      deleteResponse.chatMessages = {
        totalMessagesDeleted: deletedChatMessages.count,
        deletedMessages: deletedChatMessages,
      };

      deleteResponse.taskInstanceMeta = {
        deletedTaskInstanceMeta,
      };
    } catch (error) {
      console.error("Error deleting chat messages & taskInstanceMeta:", error);
      return NextResponse.json(
        { error: "Error deleting chat messages & taskInstanceMeta" },
        { status: 500 }
      );
    }

    // 5. delete the github repo.
    try {
      if (clientRequest.prNumber && clientRequest.repoName) {
        const closedPr = await closePullRequest(
          clientRequest.repoName,
          clientRequest.prNumber
        );
        if (!closedPr.success) {
          return NextResponse.json(
            { error: "Error closing pull request" },
            { status: 500 }
          );
        }
        deleteResponse.github = {
          closedPr,
        };
      }
    } catch (error) {
      console.error("Error deleting github repo:", error);
      return NextResponse.json(
        { error: "Error deleting github repo" },
        { status: 500 }
      );
    }

    // 6. delete request updates
    try {
      const deletedRequestUpdates = await prisma.requestUpdate.deleteMany({
        where: {
          originClientRequestId: id,
        },
      });

      deleteResponse.requestUpdates = {
        totalUpdatesDeleted: deletedRequestUpdates.count,
      };
    } catch (error) {
      console.error("Error deleting request updates:", error);
      return NextResponse.json(
        { error: "Error deleting request updates" },
        { status: 500 }
      );
    }

    // 7. delete webhook events
    try {
      const deletedWebhookEvents = await prisma.webhookEvent.deleteMany({
        where: {
          originClientRequestId: id,
        },
      });

      deleteResponse.webhookEvents = {
        totalEventsDeleted: deletedWebhookEvents.count,
      };
    } catch (error) {
      console.error("Error deleting webhook events:", error);
      return NextResponse.json(
        { error: "Error deleting webhook events" },
        { status: 500 }
      );
    }

    // 8. delete shard pages
    try {
      const deletedShardPages = await prisma.shardPage.deleteMany({
        where: {
          clientRequestId: id,
        },
      });

      deleteResponse.shardPages = {
        totalPagesDeleted: deletedShardPages.count,
      };
    } catch (error) {
      console.error("Error deleting shard pages:", error);
      return NextResponse.json(
        { error: "Error deleting shard pages" },
        { status: 500 }
      );
    }

    // 9. mark clientRequest as deleted
    try {
      const clientRequest = await prisma.clientRequest.update({
        where: {
          id: id,
        },
        data: {
          archiveStatus: "archived",
          mentionedClientSecretIds: [],
        },
      });
      deleteResponse.clientRequest = {
        clientRequest,
      };

      const clientDeployment = await prisma.clientDeployment.deleteMany({
        where: {
          originClientRequestId: id,
        },
      });

      deleteResponse.clientDeployment = {
        clientDeployment,
        totalDeploymentsDeleted: clientDeployment.count,
      };
    } catch (error) {
      console.error("Error archiving client request:", error);
      return NextResponse.json(
        { error: "Error archiving client request" },
        { status: 500 }
      );
    }

    // ALSO MODIFY THE DEPLOY STEP.

    return NextResponse.json(
      {
        success: true,
        message:
          "Deletion triggered. We will delete the function in a few minutes.",
        stats: deleteResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
