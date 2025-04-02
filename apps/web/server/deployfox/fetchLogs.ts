import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { TaskInstanceMetaType } from "../convertfox/types";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { ClientRequest } from "@prisma/client";

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
      limit: 2,
    });

    const latestRun = workflowRuns.data.workflow_runs[0];

    if (
      latestRun?.status === "completed" &&
      latestRun?.conclusion === "failure"
    ) {
      // Get workflow run logs
      // TODO: Implement log analysis and automatic fix generation
      // This would involve:
      // 1. Parsing the logs to identify common failure patterns
      // 2. Generating fixes based on the identified issues
      // 3. Creating a new commit with the fixes
      // 4. Triggering a new workflow run
      // Notify about the failure and attempted fix
      //   await slackBotSdk.sendMessage({
      //     text: `DeployFox detected issues in deployment for ${clientRequest.title} 🔍`,
      //     blocks: [
      //       {
      //         type: "section",
      //         text: {
      //           type: "plain_text",
      //           text: `Deployment issues detected for ${clientRequest.title}`,
      //         },
      //       },
      //       {
      //         type: "section",
      //         text: {
      //           type: "mrkdwn",
      //           text: `Workflow run failed. Analyzing logs and attempting fixes...`,
      //         },
      //       },
      //     ],
      //     icon_url: MICROFOX_LOGO,
      //     username: "Microfox",
      //     channel: MySlackChannels.microfox_updates,
      //   });
    }
    const logs = await octokitSdk.rest.actions.downloadWorkflowRunLogs({
      owner: TEMPLATE_REPO_OWNER,
      repo: clientRequest.repoName ?? "",
      run_id: latestRun?.id ?? 0,
    });
    if (logs.data) {
      dataStream.writeMessageAnnotation({
        type: "ui",
        objectType: "text",
        persona: "deployfox",
        text: `Logs fetched`,
        data: JSON.stringify(logs.data),
      });
    }
  } catch (error) {
    console.error("Error monitoring workflow runs:", error);
  }
};
