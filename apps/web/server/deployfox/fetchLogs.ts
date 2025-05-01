import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { DeployStep, TaskInstanceMetaType } from "../convertfox/types";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { MySlackChannels } from "@/utils/services/slackBotSdk";
import { MICROFOX_LOGO } from "@/utils/services/slackBotSdk";
import { slackBotSdk } from "@/utils/services/slackBotSdk";
import dedent from "dedent";

export const fetchLogs = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType
) => {
  const { dataStream } = props;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Re-Fetching logs",
  });

  const runId = await getLatestRunForClientRequest(
    clientRequest,
    DEPLOY_STAGE.STAGING
  );

  return {
    run_id: runId,
  };
};

export const getRunforClientRequestbySha = async ({
  head_sha,
  clientRequest,
  mustRunId,
}: {
  head_sha: string;
  clientRequest: ClientRequest;
  mustRunId?: boolean;
}) => {
  const octokitSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const workflowRuns = await octokitSdk.rest.actions.listWorkflowRunsForRepo({
    owner: PROJECT_REPO_OWNER,
    repo: clientRequest.repoName ?? "",
    branch: clientRequest.prBranch ?? "",
    // stage === DEPLOY_STAGE.STAGING
    //   ? (clientRequest.prBranch ?? "")
    //   : "project/master",
    head_sha,
    per_page: 5,
  });

  //console.log("workflowRuns", workflowRuns.data);

  const runId = workflowRuns.data.workflow_runs[0]?.id;
  if (mustRunId && !runId) {
    await octokitSdk.request(
      "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable",
      {
        owner: PROJECT_REPO_OWNER,
        repo: clientRequest.repoName ?? "",
        workflow_id: "deploy.yml",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
  }

  return runId;
};

export const getLatestRunForClientRequest = async (
  clientRequest: ClientRequest,
  stage: DEPLOY_STAGE
) => {
  const octokitSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const workflowRuns = await octokitSdk.rest.actions.listWorkflowRunsForRepo({
    owner: PROJECT_REPO_OWNER,
    repo: clientRequest.repoName ?? "",
    branch: clientRequest.prBranch ?? "",
    // stage === DEPLOY_STAGE.STAGING
    //   ? (clientRequest.prBranch ?? "")
    //   : "project/master",
    per_page: 5,
  });

  return workflowRuns.data.workflow_runs[0]?.id;
};

export const fetchWorkflowActionRun = async (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  stage: DEPLOY_STAGE,
  runId: number,
  props?: StreamingFucntionProps<any, any>
) => {
  const octokitSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    const { data: latestRun } = await octokitSdk.rest.actions.getWorkflowRun({
      owner: PROJECT_REPO_OWNER,
      repo: clientRequest.repoName ?? "",
      run_id: runId,
    });

    const cleanedMetadata = {
      ...latestRun,
      head_repository: undefined,
      repository: undefined,
      triggering_actor: undefined,
      actor: undefined,
    };

    console.log(
      "latestRun",
      cleanedMetadata?.workflow_id,
      cleanedMetadata?.conclusion,
      cleanedMetadata?.head_sha
      //latestRun
    );

    if (
      latestRun?.status === "completed" &&
      latestRun?.conclusion === "failure"
    ) {
      props?.dataStream?.writeMessageAnnotation({
        type: "thinking",
        value: "Workflow run failed. Analyzing logs and attempting fixes...",
      });
      const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
        clientRequestId: taskInstanceMeta.originClientRequestId,
        otherData: {
          deployStep: {
            ...taskInstanceMeta.deployStep,
            startTime: latestRun?.run_started_at,
            metadata: cleanedMetadata,
            status: "failed",
            shouldBreak: true,
          } as DeployStep,
        },
      });
      await slackBotSdk.sendMessage({
        text: `DeployFox is struck. deployment failed - ${clientRequest.title} 🔍`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: dedent`Workflow run failed for ${clientRequest.title}. 
              # Stats
              - Workflow ID: ${latestRun.workflow_id}
              - Conclusion: ${latestRun.conclusion}
              - Run ID: ${latestRun.id}
              - Run Started At: ${latestRun.run_started_at}
              - Run Updated At: ${latestRun.updated_at}
              
              # Logs
              Logs can be seen at ${latestRun.html_url}`,
            },
          },
        ],
        icon_url: MICROFOX_LOGO,
        username: "Microfox",
        channel: MySlackChannels.microfox_updates,
      });
      return {
        shouldBreak: true,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    } else if (
      latestRun?.status === "completed" &&
      latestRun?.conclusion === "success"
    ) {
      props?.dataStream?.writeMessageAnnotation({
        type: "thinking",
        value: "Workflow run succeeded. Fetching logs...",
      });
      const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
        clientRequestId: taskInstanceMeta.originClientRequestId,
        otherData: {
          deployStep: {
            ...taskInstanceMeta.deployStep,
            startTime: latestRun?.run_started_at,
            endTime: latestRun?.updated_at,
            metadata: cleanedMetadata,
            status: "success",
            shouldBreak: true,
          } as DeployStep,
        },
      });
      return {
        shouldBreak: true,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    } else if (latestRun?.status === "queued") {
      props?.dataStream?.writeMessageAnnotation({
        type: "thinking",
        value: "Workflow run is currently in queue",
      });
      const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
        clientRequestId: taskInstanceMeta.originClientRequestId,
        otherData: {
          deployStep: {
            ...taskInstanceMeta.deployStep,
            startTime: latestRun?.run_started_at,
            metadata: cleanedMetadata,
            status: "pending",
            shouldBreak: false,
          } as DeployStep,
        },
      });
      return {
        shouldBreak: false,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    } else {
      props?.dataStream?.writeMessageAnnotation({
        type: "thinking",
        value: "Workflow run is pending. Fetching logs...",
      });
      const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
        clientRequestId: taskInstanceMeta.originClientRequestId,
        otherData: {
          deployStep: {
            ...taskInstanceMeta.deployStep,
            startTime: latestRun?.run_started_at,
            endTime: latestRun?.updated_at,
            metadata: cleanedMetadata,
            status: "pending",
            shouldBreak: false,
          } as DeployStep,
        },
      });
      return {
        shouldBreak: false,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    }
    // const logs = await octokitSdk.rest.actions.downloadWorkflowRunLogs({
    //   owner: PROJECT_REPO_OWNER,
    //   repo: clientRequest.repoName ?? "",
    //   run_id: latestRun?.id ?? 0,
    // });
    // console.log("logs", logs.data, latestRun?.id, clientRequest.repoName);
    // if (logs.data) {
    //   dataStream.writeMessageAnnotation({
    //     type: "ui",
    //     objectType: "text",
    //     persona: "deployfox",
    //     text: `Logs fetched`,
    //     data: JSON.stringify(logs.data),
    //   });
    // }
  } catch (error) {
    console.error("Error monitoring workflow runs:", error);
  }
};
