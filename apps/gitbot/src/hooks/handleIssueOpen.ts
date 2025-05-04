import { Octokit } from "@octokit/rest";
import { EmitterWebhookEvent } from "@octokit/webhooks/types";

export const handleIssueOpen = (
  payload: EmitterWebhookEvent<"issues.opened">["payload"],
  octokit: Octokit
) => {
  console.log("Issue opened event received:", JSON.stringify(payload, null, 2));

  // 1. get the issue title & description, parse links from description
  // 2. create a linked pull request deparsed and correct info pass in as a json in commit (use .packagefox/ folder)
};

// observe intent (microfox)
// - add a new package (requires baseURL)
// - add/update functionality to existing package (requires packageName, optional baseURL )
// - fix a bug in existing package (requires packageName, optional baseURL, requires information or logs about the bug)
// - generate embeddings for a package (requires package name)
// - test if package is working (requires packageName)
// - review package (requires packageName)

// - packageFox
// - testFox
// - reviewFox
// - reportFox
