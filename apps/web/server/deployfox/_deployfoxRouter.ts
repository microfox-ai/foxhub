import { findLastElementWith } from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
  getClientDeployment,
} from "@/utils/services/db_functions/getClientRequest";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  ServerStreamingFunction,
  defaultCallbackResultBody,
} from "@repo/ai-utils/router";
import { deployViaGit } from "./deployGit";
import {
  DeployStep,
} from "../convertfox/types";
import {
  getRunforClientRequestbySha,
} from "./fetchLogs";
import { DEPLOY_STAGE, FUNCTIONTYPE } from "@prisma/client";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import path from "path";
import { execSync } from "child_process";
import { prisma } from "@/prisma/prisma";
import fs from 'fs/promises';
import { findAvailablePort, runCommand } from "./cmdHelpers";
import { platform } from "os";

export const deployFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const { clientRequestId } = requestBody;
  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  const stage = requestBody.stage;

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "deployfox",
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: `Deploying Automation to ${stage ?? DEPLOY_STAGE.STAGING}`,
  });

  await updateTaskInstanceMeta({
    clientRequestId,
    otherData: {
      deployStep: {
        startTime: new Date().toISOString(),
        status: "pending",
      },
    },
  });

  if (stage === DEPLOY_STAGE.PROD) {

    // Monitor workflow runs
    const { sha } = await deployViaGit(
      props,
      clientRequest,
      taskInstanceMeta,
      stage
    );
    console.log("sha", sha);
    if (!sha) {
      throw new Error("Sha is undefined");
    }

    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: `Deployement triggered, checking status updates!`,
    });

    // Wait for 20 seconds before starting to check logs
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(undefined);
      }, 10000);
    });

    const runId = await getRunforClientRequestbySha({
      head_sha: sha,
      clientRequest,
      stage: stage ?? DEPLOY_STAGE.STAGING,
    });
    console.log("runId", runId);

    dataStream.writeMessageAnnotation({
      type: "loading",
      content: `Deploymnent detected, waiting for completion!`,
    });

    await updateTaskInstanceMeta({
      clientRequestId,
      otherData: {
        deployStep: {
          runId,
          stage: stage ?? DEPLOY_STAGE.STAGING,
          status: "pending",
        },
      },
    });
    // dataStream.writeMessageAnnotation({
    //   type: "thinking",
    //   value: "Checking logs",
    // });

    // while (true) {
    //   const conditions = await fetchLogs(
    //     props,
    //     clientRequest,
    //     taskInstanceMeta as TaskInstanceMetaType
    //   );
    //   taskInstanceMeta = conditions?.taskInstanceMeta as any;

    //   // Handle success case
    //   if (taskInstanceMeta?.deployStep?.status === "success") {
    //     break;
    //   }

    //   // Handle failure cases
    //   if (taskInstanceMeta?.deployStep?.status === "failed") {
    //     break;
    //   }

    //   // Handle timeout
    //   if (attempts >= MAX_ATTEMPTS) {
    //     throw new Error("Deployment timed out after 5 minutes");
    //   }

    //   if (conditions?.taskInstanceMeta) {
    //     taskInstanceMeta = conditions?.taskInstanceMeta as any;
    //   }
    //   if (conditions?.shouldBreak) {
    //     break;
    //   }

    //   attempts++;
    //   await new Promise((resolve) => setTimeout(resolve, 3000));
    // }

    // const clientDeployment = await getClientDeployment(clientRequestId);
    await slackBotSdk.sendMessage({
      icon_url: MICROFOX_LOGO,
      channel: MySlackChannels.microfox_updates,
      text: `Deployfox triggered ${stage} a deployment for ${clientRequest.title} ${runId ? `with runId ${runId}` : ""
        }`,
    });

    dataStream.writeMessageAnnotation({
      type: "ui",
      objectType: "deploymentsInfo",
      persona: "deployfox",
      text: `Deployments Completed !`,
      pingerInterval: 5000,
      stage: stage ?? DEPLOY_STAGE.STAGING,
      ...(runId && { runId }),
    });
  } else {
    try {
      if (!clientRequest?.repoName || !clientRequest?.requestDir) {
        throw new Error("Repo name or request dir is undefined");
      }
      const projectPath = path.join(clientRequest?.repoName ?? "", clientRequest?.requestDir ?? "");

      // create env.json file
      let clientSecrets = await prisma.clientSecret.findMany({
        where: {
          botProjectId: clientRequest.botProjectId,
        },
      });
      clientSecrets = clientSecrets.filter((secret) => secret.clientRequestIds.includes(clientRequestId))
      const envJson = clientSecrets.reduce((acc: Record<string, any>, secret) => {
        secret.variables.forEach((variable: any) => {
          if (variable?.key) {
            acc[variable.key] = variable.value
          }
        })
        return acc
      }, {})
      const envJsonString = JSON.stringify(envJson, null, 2);
      const envFilePath = path.join(projectPath, "env.json");
      await fs.writeFile(envFilePath, envJsonString);
      const startAt = new Date().toISOString();

      execSync(`cd ../../`);
      execSync(`cd ${projectPath}`);

      // Run npm install
      dataStream.writeMessageAnnotation({
        type: "loading",
        content: `Installing dependencies...`,
      });
      await runCommand('npm', ['install'], projectPath);

      // Run npm run build
      dataStream.writeMessageAnnotation({
        type: "loading",
        content: `Building...`,
      });
      await runCommand('npm', ['run', 'build'], projectPath);

      const availablePort = await findAvailablePort(9001, 9500);
      execSync(`cd ../../`);
      execSync(`cd ${projectPath}`);

      dataStream.writeMessageAnnotation({
        type: "loading",
        content: `Starting...`,
      });

      const os = platform();
      // pm2 start npm --name foxhub-function-9001 -- run start -- --httpPort 9001
      if (os === 'win32') {
        await runCommand('pm2', ['start', '"C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"', '--name', `foxhub-function-${availablePort}`, '--', 'run', 'start', '--', '--httpPort', availablePort.toString()], projectPath);
        // runCommand('npm', ['start'], projectPath);
      } else {
        await runCommand('pm2', ['start', 'npm', '--name', `foxhub-function-${availablePort}`, '--', 'run', 'start', '--', '--httpPort', availablePort.toString()], projectPath);
      }
      // Wait for 10 seconds to ensure the server is fully started
      console.log("Please wait for 10 seconds to ensure the server is fully started")
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log("Wait is over. Starting to create client deployment")

      const requestDirArray = clientRequest?.requestDir?.split("/")
      const name = requestDirArray[requestDirArray.length - 1]
      await prisma.clientDeployment.upsert({
        where: { id: clientRequestId },
        update: {
          baseUrl: `http://localhost:${availablePort}`,
          name: `${name}-${stage ?? DEPLOY_STAGE.STAGING}-${clientRequestId}`,
          stage: stage ?? DEPLOY_STAGE.STAGING,
          type: FUNCTIONTYPE.MIXED,
          // status: DEPLOYMENTSTATUS.ACTIVE,
          metadata: {},
          endpoints: [],
        },
        create: {
          id: clientRequestId,
          userId: clientRequest.userId,
          botProjectId: clientRequest.botProjectId,
          originClientRequestId: clientRequestId,
          name: `${name}-${stage ?? DEPLOY_STAGE.STAGING}-${clientRequestId}`,
          baseUrl: `http://localhost:${availablePort}`,
          stage: stage ?? DEPLOY_STAGE.STAGING,
          type: FUNCTIONTYPE.MIXED,
          // status: DEPLOYMENTSTATUS.ACTIVE,
          metadata: {},
          endpoints: [],
        },
      });

      const endAt = new Date().toISOString();

      dataStream.writeMessageAnnotation({
        type: "ui",
        objectType: "deploymentsInfo",
        persona: "deployfox",
        text: `Deployment Completed!`,
        pingerInterval: 5000,
        stage: stage ?? DEPLOY_STAGE.STAGING,
      });

      const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
        where: {
          originClientRequestId: clientRequestId,
        },
      });

      if (taskInstanceMeta) {
        await updateTaskInstanceMeta({
          clientRequestId: clientRequestId,
          otherData: {
            deployStep: {
              ...(taskInstanceMeta?.deployStep as DeployStep),
              stage: stage ?? DEPLOY_STAGE.STAGING,
              startTime: startAt,
              endTime: endAt,
              status: "success",
              shouldBreak: true,
              deployment: {
                stage: stage ?? DEPLOY_STAGE.STAGING,
                type: FUNCTIONTYPE.MIXED,
                id: clientRequestId,
              },
            } as DeployStep,
          },
        });
      }
    } catch (error) {
      throw error;
    }
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
