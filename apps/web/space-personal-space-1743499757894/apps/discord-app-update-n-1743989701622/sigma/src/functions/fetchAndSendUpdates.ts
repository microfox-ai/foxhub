import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Octokit } from "@microfox/github";
import { createDiscordSdk } from "@microfox/discord-sdk";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

// Initialize GitHub client
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Discord SDK
const discordSdk = createDiscordSdk({
  botToken: process.env.DISCORD_TOKEN,
});

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

interface FetchAndSendUpdatesParams {
  owner: string;
  repo: string;
  discordChannelId: string;
}

/**
 * Fetches the latest changelog entries from GitHub and sends them to Discord
 */
export const fetchAndSendUpdates = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const params = JSON.parse(event.body || "{}") as FetchAndSendUpdatesParams;
    const { owner, repo, discordChannelId } = params;

    if (!owner || !repo || !discordChannelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    // Fetch the CHANGELOG.md file content
    const { data: changelogFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "CHANGELOG.md",
    });

    if (!("content" in changelogFile)) {
      throw new Error("CHANGELOG.md not found or is a directory");
    }

    const changelogContent = Buffer.from(changelogFile.content, "base64").toString("utf-8");

    // Parse the changelog content
    const latestChanges = parseChangelog(changelogContent);

    // Get the last sent version from Redis
    const lastSentVersion = await redis.get(`${owner}:${repo}:lastSentVersion`);

    // Filter out already sent versions
    const newChanges = latestChanges.filter(change => {
      return !lastSentVersion || change.version > lastSentVersion;
    });

    if (newChanges.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No new updates to send" }),
      };
    }

    // Send updates to Discord
    for (const change of newChanges) {
      const message = formatDiscordMessage(change);
      await discordSdk.sendMessage({
        content: message,
        channelId: discordChannelId,
      });
    }

    // Update the last sent version in Redis
    await redis.set(`${owner}:${repo}:lastSentVersion`, newChanges[0].version);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Updates sent successfully" }),
    };
  } catch (error) {
    console.error("Error in fetchAndSendUpdates:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
    security?: string[];
  };
}

function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split("\n");
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: keyof ChangelogEntry["changes"] | null = null;

  for (const line of lines) {
    if (line.startsWith("## [")) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      const [version, date] = line.match(/\[(.*?)\]\s*-\s*(.*)/)?.slice(1) || [];
      currentEntry = { version, date, changes: {} };
      currentSection = null;
    } else if (currentEntry) {
      if (line.startsWith("### ")) {
        currentSection = line.slice(4).toLowerCase() as keyof ChangelogEntry["changes"];
      } else if (currentSection && line.startsWith("- ")) {
        if (!currentEntry.changes[currentSection]) {
          currentEntry.changes[currentSection] = [];
        }
        currentEntry.changes[currentSection]!.push(line.slice(2));
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function formatDiscordMessage(change: ChangelogEntry): string {
  let message = `**New Update: ${change.version}** (${change.date})\n\n`;

  for (const [section, items] of Object.entries(change.changes)) {
    if (items && items.length > 0) {
      message += `**${section.charAt(0).toUpperCase() + section.slice(1)}:**\n`;
      for (const item of items) {
        message += `• ${item}\n`;
      }
      message += "\n";
    }
  }

  return message.trim();
}

/**
 * Documentation for the fetchAndSendUpdates function
 */
export const fetchAndSendUpdatesDocs = {
  instructions: `
This function is designed to be triggered as a webhook or scheduled as a cron job.

To set up as a webhook:
1. Deploy the function to your serverless platform.
2. Obtain the function's URL endpoint.
3. Set up a webhook in your GitHub repository:
   - Go to your repository settings
   - Navigate to "Webhooks"
   - Click "Add webhook"
   - Set the Payload URL to your function's endpoint
   - Choose "application/json" as the content type
   - Select "Let me select individual events" and choose "Release" events
   - Save the webhook

To set up as a cron job:
1. Deploy the function to your serverless platform.
2. Configure a cron job to trigger the function at your desired interval.
   For example, to run every day at midnight UTC:
   - AWS CloudWatch Events / EventBridge: cron(0 0 * * ? *)
   - Azure Functions: 0 0 0 * * *
   - Google Cloud Functions: 0 0 * * *

Make sure to provide the necessary environment variables:
- GITHUB_TOKEN: Your GitHub personal access token
- DISCORD_TOKEN: Your Discord bot token
- UPSTASH_REDIS_REST_URL: Your Upstash Redis REST URL
- UPSTASH_REDIS_REST_TOKEN: Your Upstash Redis REST token
`,
  summary: "Fetch changelog updates from GitHub and send them to Discord",
  description: "This function fetches the latest changelog entries from a specified GitHub repository, parses them, and sends the updates to a designated Discord channel.",
  parameters: [
    {
      name: "owner",
      in: "body",
      description: "The GitHub repository owner",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      name: "repo",
      in: "body",
      description: "The GitHub repository name",
      required: true,
      schema: {
        type: "string"
      }
    },
    {
      name: "discordChannelId",
      in: "body",
      description: "The Discord channel ID to send updates to",
      required: true,
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    "200": {
      description: "Successfully processed the request",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Status message"
              }
            }
          }
        }
      }
    },
    "400": {
      description: "Bad request - missing required parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message"
              }
            }
          }
        }
      }
    },
    "500": {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message"
              }
            }
          }
        }
      }
    }
  }
};