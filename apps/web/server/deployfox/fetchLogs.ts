import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { DeployStep, TaskInstanceMetaType } from "../convertfox/types";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { ClientRequest } from "@prisma/client";
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

  const octokitSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Re-Fetching logs",
  });
  try {
    const workflowRuns = await octokitSdk.rest.actions.listWorkflowRunsForRepo({
      owner: TEMPLATE_REPO_OWNER,
      repo: clientRequest.repoName ?? "",
      branch: clientRequest.prBranch ?? "",
      per_page: 5,
    });

    const latestRun = workflowRuns.data.workflow_runs[0];
    const cleanedMetadata = { ...latestRun };
    delete cleanedMetadata.head_repository;
    delete cleanedMetadata.repository;
    delete cleanedMetadata.triggering_actor;
    delete cleanedMetadata.actor;

    console.log(
      "latestRun",
      latestRun?.workflow_id,
      latestRun?.conclusion
      //latestRun
    );

    if (
      latestRun?.status === "completed" &&
      latestRun?.conclusion === "failure"
    ) {
      dataStream.writeMessageAnnotation({
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
      dataStream.writeMessageAnnotation({
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
          } as DeployStep,
        },
      });
      return {
        shouldBreak: true,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    } else if (latestRun?.status === "queued") {
      dataStream.writeMessageAnnotation({
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
          } as DeployStep,
        },
      });
      return {
        shouldBreak: false,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    } else {
      dataStream.writeMessageAnnotation({
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
            status: "success",
          } as DeployStep,
        },
      });
      return {
        shouldBreak: false,
        taskInstanceMeta: taskInstanceMetaUpdated,
      };
    }
    // const logs = await octokitSdk.rest.actions.downloadWorkflowRunLogs({
    //   owner: TEMPLATE_REPO_OWNER,
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
