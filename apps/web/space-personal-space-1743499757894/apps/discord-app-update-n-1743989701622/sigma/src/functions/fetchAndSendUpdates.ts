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
 * @param event - The API Gateway event
 * @returns APIGatewayProxyResult
 */
export const fetchAndSendUpdates = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { owner, repo, discordChannelId } = JSON.parse(event.body || "{}") as FetchAndSendUpdatesParams;

    if (!owner || !repo || !discordChannelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" }),
      };
    }

    // Fetch the CHANGELOG.md file from GitHub
    const { data: changelogFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "CHANGELOG.md",
    });

    if (!("content" in changelogFile)) {
      throw new Error("CHANGELOG.md not found");
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
        body: JSON.stringify({ message: "No new changes to send" }),
      };
    }

    // Send updates to Discord
    for (const change of newChanges) {
      await discordSdk.sendMessage({
        content: formatDiscordMessage(change),
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
  changes: string[];
}

/**
 * Parses the changelog content and extracts the latest entries
 * @param content - The content of the CHANGELOG.md file
 * @returns An array of ChangelogEntry objects
 */
function parseChangelog(content: string): ChangelogEntry[] {
  const lines = content.split("\n");
  const entries: ChangelogEntry[] = [];
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

/**
 * Formats a changelog entry for Discord
 * @param entry - The ChangelogEntry object
 * @returns A formatted string for Discord
 */
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
2. Obtain the function's URL from your serverless platform.
3. Set up a webhook in your GitHub repository:
   - Go to your repository settings
   - Click on "Webhooks"
   - Add a new webhook
   - Set the Payload URL to your function's URL
   - Choose "application/json" as the content type
   - Select the events you want to trigger the webhook (e.g., "Push" event)
   - Save the webhook

To set up as a cron job:
1. Deploy this function to your serverless platform.
2. In your serverless configuration file (e.g., serverless.yml), add a schedule event:

   events:
     - schedule: cron(0 0 * * ? *) # This runs the function daily at midnight UTC

3. Adjust the cron expression as needed for your desired schedule.

When calling this function, provide the following parameters in the request body:
{
  "owner": "GitHub_username_or_organization",
  "repo": "repository_name",
  "discordChannelId": "Discord_channel_ID"
}

Make sure to set up the required environment variables:
- GITHUB_TOKEN: A GitHub personal access token with repo scope
- DISCORD_TOKEN: Your Discord bot token
- UPSTASH_REDIS_REST_URL: The URL for your Upstash Redis instance
- UPSTASH_REDIS_REST_TOKEN: The token for your Upstash Redis instance
`,
  summary: "Fetch changelog updates from GitHub and send them to Discord",
  description: "This function fetches the latest changelog entries from a specified GitHub repository, parses the changelog, and sends the updates to a designated Discord channel.",
  parameters: [
    {
      name: "owner",
      in: "body",
      description: "The GitHub username or organization that owns the repository",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "repo",
      in: "body",
      description: "The name of the GitHub repository",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "discordChannelId",
      in: "body",
      description: "The ID of the Discord channel where updates will be sent",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    "200": {
      description: "Successfully fetched and sent updates",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "A success message",
              },
            },
          },
        },
      },
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
                description: "Error message describing the missing parameters",
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