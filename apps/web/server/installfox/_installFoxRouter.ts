import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
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
} from "@/server/convertfox/types";
import { createPullRequest } from "../buildfox/createPullRequest";
import { getServiceName } from "../buildfox/helper/getServiceName";
import { MinionType } from "@/components/screens/hooks/convertors";
import { object } from "webidl-conversions";
import { getClientSecretsFromTemplateEnvs } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { addTemplateSecretsToClientRequest } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
interface ClientRequestMeta {
  repoName: string;
  repoDir: string;
  prBranch: string;
  prNumber: number;
  prUrl: string;
  metadata: any;
}

export const installFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  // Check if shardId exists in requestBody
  if (!requestBody.shard_id) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: MinionType.InstallFox,
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Starting installation process...",
  });

  // 0. Get the clientRequest and shardPage
  const shardPage = await prisma.shardPage.findUnique({
    where: {
      id: requestBody.shard_id,
    },
  });

  if (!shardPage) {
    dataStream.writeMessageAnnotation({
      type: "error",
      content: "Shard not found",
    });
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  let clientRequest = await getClientRequest(requestBody.clientRequestId);
  if (!clientRequest) {
    dataStream.writeMessageAnnotation({
      type: "error",
      content: "Client request not found",
    });
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  const clientRequestMeta =
    shardPage.clientRequestMeta as unknown as ClientRequestMeta;
  const shardTaskInstanceMeta =
    shardPage.taskInstanceMeta as unknown as TaskInstanceMetaType;

  if (clientRequestMeta.repoDir && !clientRequest.requestDir) {
    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Creating new codebase for this request.",
    });

    clientRequest = await createPullRequest({
      clientRequestId: clientRequest.id,
      description: clientRequestMeta.metadata.description,
      title: clientRequestMeta.metadata.title,
      dataStream,
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

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Adding Internal secrets",
  });

  let templateType = (taskInstanceMeta as any as TaskInstanceMetaType)
    ?.taskStructure?.templateType;
  // at this step, create template secrets as needed
  // create secrets
  const templateSecrets = await getClientSecretsFromTemplateEnvs(
    templateType as CodeTemplateType
  );

  if (templateSecrets.length > 0) {
    await addTemplateSecretsToClientRequest(clientRequest, templateSecrets);
  }

  if (!taskInstanceMeta) {
    dataStream.writeMessageAnnotation({
      type: "error",
      content: "Task instance meta not found",
    });
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Writing the required codebase",
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
    commitMessage: `nodeploy: Installing shard ${shardPage.title} for ${clientRequest.title}`,
    excludeFiles: ["clientRequest.json"],
    clientRequest,
    taskInstanceMeta: taskInstanceMeta as any as TaskInstanceMetaType,
  });

  // 4. Output UI saying primary setups are done
  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "installSetup",
    persona: "installfox",
    text: "Primary setup is complete! We need a few more details before we get started.",
    object: {
      platforms: shardTaskInstanceMeta.taskIntegrations?.platforms ?? [],
      envVariablesUsed:
        shardTaskInstanceMeta.buildingStep?.envVariablesUsed ?? [],
    },
    envVariablesCollect:
      shardTaskInstanceMeta.buildingStep?.envsToCollect ?? [],
  });

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
