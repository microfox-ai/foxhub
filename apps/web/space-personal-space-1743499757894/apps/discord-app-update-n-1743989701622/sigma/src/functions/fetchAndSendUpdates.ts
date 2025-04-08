import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import dotenv from "dotenv";
import { Octokit } from "@microfox/github";
import { createDiscordSdk } from "@microfox/discord-sdk";
import { Redis } from "@upstash/redis";

dotenv.config();

// Initialize Octokit
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

interface UpdatesConfig {
  owner: string;
  repo: string;
  changelogPath: string;
  discordChannelId: string;
}

/**
 * Fetches the latest changelog entries from Github and sends them to Discord
 */
export const fetchAndSendUpdates = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const config: UpdatesConfig = JSON.parse(event.body || "{}");

    if (!config.owner || !config.repo || !config.changelogPath || !config.discordChannelId) {
      throw new Error("Missing required configuration parameters");
    }

    // Fetch the CHANGELOG.md file content
    const { data: changelogContent } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: config.changelogPath,
    });

    if (!("content" in changelogContent)) {
      throw new Error("Unable to fetch changelog content");
    }

    const decodedContent = Buffer.from(changelogContent.content, "base64").toString("utf-8");

    // Parse the changelog to get the latest entries
    const latestEntries = parseChangelog(decodedContent);

    // Get the last sent entry from Redis
    const lastSentEntry = await redis.get("lastSentChangelogEntry");

    // Filter out entries that have already been sent
    const newEntries = latestEntries.filter(entry => entry.version !== lastSentEntry);

    if (newEntries.length === 0) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "No new updates to send" }),
      };
    }

    // Send new entries to Discord
    for (const entry of newEntries) {
      await discordSdk.sendMessage({
        content: formatDiscordMessage(entry),
        channelId: config.discordChannelId,
      });
    }

    // Update the last sent entry in Redis
    await redis.set("lastSentChangelogEntry", newEntries[0].version);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: `Sent ${newEntries.length} new updates to Discord` }),
    };
  } catch (error) {
    console.error("Error in fetchAndSendUpdates:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
    };
  }
};

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split("\n");
  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    if (line.startsWith("## [")) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      const [version, date] = line.match(/\[(.*?)\]\s*-\s*(.*)/)?.slice(1) || [];
      currentEntry = { version, date, changes: [] };
    } else if (currentEntry && line.trim().startsWith("-")) {
      currentEntry.changes.push(line.trim().substring(2));
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function formatDiscordMessage(entry: ChangelogEntry): string {
  return `**New Update: ${entry.version} (${entry.date})**\n\n${entry.changes.map(change => `• ${change}`).join("\n")}`;
}

/**
 * Documentation for the fetchAndSendUpdates function
 */
export const fetchAndSendUpdatesDocs = {
  instructions: `
This function is designed to be triggered as a webhook or scheduled as a cron job to fetch the latest changelog entries from a GitHub repository and send them to a Discord channel.

To set up as a webhook:
1. Deploy this function to your serverless platform.
2. Configure the webhook URL in your preferred CI/CD tool or GitHub Actions.
3. Trigger the webhook after each release or update to the CHANGELOG.md file.

To set up as a cron job:
1. Deploy this function to your serverless platform.
2. Configure a cron job to run at your desired frequency (e.g., daily or weekly).
3. Ensure the cron job sends a POST request to the function's endpoint with the required configuration in the request body.

Example cron job configuration (using curl):
curl -X POST https://your-api-endpoint.com/api/fetch-and-send-updates \\
  -H "Content-Type: application/json" \\
  -d '{"owner":"your-github-username","repo":"your-repo-name","changelogPath":"CHANGELOG.md","discordChannelId":"your-discord-channel-id"}'

Replace the placeholder values with your actual GitHub repository information and Discord channel ID.
`,
  summary: "Fetch changelog updates from GitHub and send them to Discord",
  description: "This function retrieves the latest changelog entries from a specified GitHub repository, compares them with previously sent entries, and sends new updates to a designated Discord channel.",
  parameters: [
    {
      name: "owner",
      in: "body",
      description: "The GitHub repository owner",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "repo",
      in: "body",
      description: "The GitHub repository name",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "changelogPath",
      in: "body",
      description: "The path to the CHANGELOG.md file in the repository",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "discordChannelId",
      in: "body",
      description: "The ID of the Discord channel to send updates to",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    "200": {
      description: "Successfully processed changelog updates",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "A message indicating the result of the operation",
              },
            },
          },
        },
      },
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
                description: "Error message describing what went wrong",
              },
            },
          },
        },
      },
    },
  },
};