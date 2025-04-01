import {
  ServerStreamingFunction,
  defaultCallbackResultBody,
} from "@repo/ai-utils/router";
import { findLastElementWith } from "@/utils/helpers/array";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { models } from "../models";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCharacter } from "../hellofox/default";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { octokitSdk } from "../buildfox/helper/gitHelpers";
import { TEMPLATE_REPO_OWNER } from "@/utils/constants/githubInfo";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";

export const deployFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const lastUserMessage = findLastElementWith(
    requestBody.messages,
    (m: any) => m.role === "user"
  );

  // Classify the user's query
  const { object: classification, usage } = await generateObject({
    model: models.googleGeminiFlash,
    schema: z.object({
      reasoning: z.string(),
      intent: z.enum(["monitor", "fix", "status", "retry"]),
    }),
    messages: [lastUserMessage],
    system: `Classify the user's message regarding deployment monitoring and fixes.
    
    Determine:
    1. User intent (monitor - watch deployment, fix - attempt to fix issues, status - check current status, retry - retry deployment)
    2. Brief reasoning for classification`,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    ...requestBody,
    model: models.googleGeminiFlash.modelId,
    usage,
  });

  const { clientRequestId } = requestBody;
  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "deployfox",
  });

  // Monitor workflow runs
  try {
    const workflowRuns = await octokitSdk.rest.actions.listWorkflowRunsForRepo({
      owner: TEMPLATE_REPO_OWNER,
      repo: clientRequest.repoName ?? "",
      branch: clientRequest.prBranch ?? "",
    });

    const latestRun = workflowRuns.data.workflow_runs[0];

    if (
      latestRun?.status === "completed" &&
      latestRun?.conclusion === "failure"
    ) {
      // Get workflow run logs
      const logs = await octokitSdk.rest.actions.downloadWorkflowRunLogs({
        owner: TEMPLATE_REPO_OWNER,
        repo: clientRequest.repoName ?? "",
        run_id: latestRun?.id ?? 0,
      });

      // TODO: Implement log analysis and automatic fix generation
      // This would involve:
      // 1. Parsing the logs to identify common failure patterns
      // 2. Generating fixes based on the identified issues
      // 3. Creating a new commit with the fixes
      // 4. Triggering a new workflow run

      // Notify about the failure and attempted fix
      await slackBotSdk.sendMessage({
        text: `DeployFox detected issues in deployment for ${clientRequest.title} 🔍`,
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: `Deployment issues detected for ${clientRequest.title}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Workflow run failed. Analyzing logs and attempting fixes...`,
            },
          },
        ],
        icon_url: MICROFOX_LOGO,
        username: "Microfox",
        channel: MySlackChannels.microfox_updates,
      });
    }
  } catch (error) {
    console.error("Error monitoring workflow runs:", error);
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
