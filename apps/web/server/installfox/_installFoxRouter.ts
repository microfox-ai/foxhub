import { prisma } from "@/prisma/prisma";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import { cloneTemplate } from "@/server/deployfox/cloneTemplate";
import {
  PROJECT_REPO_OWNER,
  PUBLISHED_SHARD_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import {
  CodeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/helpers/types";
import { createPullRequest } from "../buildfox/createPullRequest";
import { getServiceName } from "../buildfox/helper/getServiceName";
import { MinionType } from "@/components/screens/hooks/convertors";
import { getClientSecretsFromTemplateEnvs } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { addTemplateSecretsToClientRequest } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { AiRouter } from "@microfox/ai-router";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { uiTool } from "../../components/screens/Chat/message/uiTool/mappers/uiTool";

interface ClientRequestMeta {
  repoName: string;
  repoDir: string;
  prBranch: string;
  prNumber: number;
  prUrl: string;
  metadata: any;
}

const installFoxAgent = new AiRouter<DefaultMessageMetadata, any, any, any>();

installFoxAgent.agent("/installfox", async (ctx) => {
  const { request, response } = ctx;

  // Check if shardId exists in request
  if (!request.shard_id) {
    response.writeMessageMetadata({
      error: "Shard ID is required",
    });
    return;
  }

  response.writeMessageMetadata({
    minionType: MinionType.InstallFox,
    loader: "Starting installation process...",
  });

  try {
    // 0. Get the clientRequest and shardPage
    const shardPage = await prisma.shardPage.findUnique({
      where: {
        id: request.shard_id,
      },
    });

    if (!shardPage) {
      response.writeMessageMetadata({
        error: "Shard not found",
      });
      return;
    }

    let clientRequest = await getClientRequest(request.clientRequestId);
    if (!clientRequest) {
      response.writeMessageMetadata({
        error: "Client request not found",
      });
      return;
    }

    const clientRequestMeta =
      shardPage.clientRequestMeta as unknown as ClientRequestMeta;
    const shardTaskInstanceMeta =
      shardPage.taskInstanceMeta as unknown as TaskInstanceMetaType;

    if (clientRequestMeta.repoDir && !clientRequest.requestDir) {
      response.writeMessageMetadata({
        loader: "Creating new codebase for this request.",
      });

      clientRequest = await createPullRequest({
        clientRequestId: clientRequest.id,
        description: clientRequestMeta.metadata.description,
        title: clientRequestMeta.metadata.title,
        fullRequestDir: clientRequestMeta.repoDir,
      });
    }

    // 1. Create Pull request for this clientRequest
    // This will be handled by the client's system

    // 2. Create a new taskInstanceMeta by copying from shard
    let taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
      where: {
        originClientRequestId: clientRequest.id,
      },
    });
    if (!taskInstanceMeta) {
      taskInstanceMeta = await prisma.taskInstanceMeta.create({
        data: {
          originClientRequestId: clientRequest.id,
          taskInfo: shardTaskInstanceMeta.taskInfo,
          initialSummary: shardTaskInstanceMeta.initialSummary,
          taskIntegrations: shardTaskInstanceMeta.taskIntegrations,
          taskStructure: shardTaskInstanceMeta.taskStructure,
          buildingStep: shardTaskInstanceMeta.buildingStep,
          minionType: MinionType.InstallFox,
        },
      });
    } else {
      taskInstanceMeta = await updateTaskInstanceMeta({
        clientRequestId: clientRequest.id,
        taskInstanceMeta: {
          originClientRequestId: clientRequest.id,
          taskInfo: shardTaskInstanceMeta.taskInfo,
          initialSummary: shardTaskInstanceMeta.initialSummary,
          taskIntegrations: shardTaskInstanceMeta.taskIntegrations,
          taskStructure: shardTaskInstanceMeta.taskStructure,
          buildingStep: shardTaskInstanceMeta.buildingStep,
          minionType: MinionType.InstallFox,
        },
      });
    }

    response.writeMessageMetadata({
      loader: "Adding Internal secrets",
    });

    let templateType = (taskInstanceMeta as any as TaskInstanceMetaType)
      ?.taskStructure?.templateType;
    // at this step, create template secrets as needed
    // create secrets
    const templateSecrets = await getClientSecretsFromTemplateEnvs(
      templateType as CodeTemplateType,
      clientRequest
    );

    if (templateSecrets.length > 0) {
      await addTemplateSecretsToClientRequest(clientRequest, templateSecrets);
    }

    if (!taskInstanceMeta) {
      response.writeMessageMetadata({
        error: "Task instance meta not found",
      });
      return;
    }

    response.writeMessageMetadata({
      loader: "Writing the required codebase",
    });

    await updateClientRequest({
      clientRequestId: clientRequest.id,
      serviceName: getServiceName(clientRequest, shardTaskInstanceMeta),
    });
    //console.log("sourcePath", clientRequestMeta.repoDir, PROJECT_REPO_OWNER);
    console.log(
      "targetPath",
      clientRequest.requestDir,
      PROJECT_REPO_OWNER,
      clientRequest.repoName
    );
    // 3. Copy code from the shardPage repo
    await cloneTemplate({
      sourceOwner: TEMPLATE_REPO_OWNER,
      targetOwner: PROJECT_REPO_OWNER,
      sourceRepo: PUBLISHED_SHARD_REPO || "",
      targetRepo: clientRequest.repoName || "",
      sourcePath: clientRequestMeta.repoDir,
      targetPath: clientRequest.requestDir || "",
      sourceBranch: "main",
      targetBranch: clientRequest.prBranch || "main",
      commitMessage: `[skip ci] Installing shard ${shardPage.title} for ${clientRequest.title}`,
      excludeFiles: ["clientRequest.json", "CHANGELOG.md"],
      clientRequest,
      taskInstanceMeta: taskInstanceMeta as any as TaskInstanceMetaType,
    });

    // 4. Output UI saying primary setups are done
    response.writeCustomTool(
      uiTool.construct<"card">("installfox", "installSetup", {
        uiType: "card",
        text: "Primary setup is complete! We need a few more details before we get started.",
        object: {
          objectType: "install_setup",
          object: {
            platforms: shardTaskInstanceMeta.taskIntegrations?.platforms ?? [],
            envVariablesUsed:
              shardTaskInstanceMeta.buildingStep?.envVariablesUsed ?? [],
            envVariablesCollect:
              shardTaskInstanceMeta.buildingStep?.envsToCollect ?? [],
          },
        },
      })
    );
  } catch (error) {
    console.error("Error in installFoxAgent", error);
    response.writeMessageMetadata({
      error: "Installation failed. Please try again.",
    });
  }
});

export { installFoxAgent };
