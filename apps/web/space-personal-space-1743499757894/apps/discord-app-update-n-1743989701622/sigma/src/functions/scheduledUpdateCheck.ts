import { APIGatewayProxyResult } from "aws-lambda";
import { Octokit } from "@microfox/github";
import { createDiscordSdk } from "@microfox/discord-sdk";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

// Initialize Octokit, Discord SDK, and Redis
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const discordSdk = createDiscordSdk({ botToken: process.env.DISCORD_TOKEN });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Configuration
const GITHUB_OWNER = "your-github-username";
const GITHUB_REPO = "your-repo-name";
const DISCORD_CHANNEL_ID = "your-discord-channel-id";
const REDIS_KEY = "last_changelog_update";

/**
 * Fetches the latest changelog entries from GitHub
 * @returns {Promise<string>} The latest changelog entries
 */
async function fetchLatestChangelog(): Promise<string> {
  const { data } = await octokit.rest.repos.getContent({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: "CHANGELOG.md",
  });

  if (!("content" in data)) {
    throw new Error("CHANGELOG.md not found");
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const lines = content.split("\n");
  let latestChanges = "";
  let isLatestVersion = true;

  for (const line of lines) {
    if (line.startsWith("## [")) {
      if (!isLatestVersion) break;
      isLatestVersion = false;
    }
    latestChanges += line + "\n";
  }

  return latestChanges.trim();
}

/**
 * Sends the changelog update to Discord
 * @param {string} changelog The changelog content to send
 */
async function sendChangelogToDiscord(changelog: string): Promise<void> {
  await discordSdk.sendMessage({
    content: "New application update available!",
    channelId: DISCORD_CHANNEL_ID,
    embeds: [
      {
        title: "Changelog",
        description: changelog,
        color: 0x00ff00,
      },
    ],
  });
}

/**
 * Checks for updates and sends them to Discord if new ones are available
 * @returns {Promise<APIGatewayProxyResult>} The result of the operation
 */
export const scheduledUpdateCheck = async (): Promise<APIGatewayProxyResult> => {
  try {
    const latestChangelog = await fetchLatestChangelog();
    const lastUpdate = await redis.get(REDIS_KEY);

    if (latestChangelog !== lastUpdate) {
      await sendChangelogToDiscord(latestChangelog);
      await redis.set(REDIS_KEY, latestChangelog);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "New updates sent to Discord successfully",
          timestamp: new Date().toISOString(),
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No new updates found",
          timestamp: new Date().toISOString(),
        }),
      };
    }
  } catch (error) {
    console.error("Error in scheduledUpdateCheck:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * OpenAPI 3.0.1 documentation for the scheduledUpdateCheck function
 */
export const scheduledUpdateCheckDocs = `
{
  "openapi": "3.0.1",
  "info": {
    "title": "Scheduled Update Check",
    "description": "Cron job that checks for new app updates and sends them to a Discord channel",
    "version": "1.0.0"
  },
  "paths": {
    "/cron/scheduled-update-check": {
      "get": {
        "summary": "Check for updates and send to Discord",
        "description": "This endpoint is triggered by a cron job to check for new updates in the GitHub repository's CHANGELOG.md file and send them to a specified Discord channel.",
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "description": "Status message"
                    },
                    "timestamp": {
                      "type": "string",
                      "format": "date-time",
                      "description": "Timestamp of the operation"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Server error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "description": "Error message"
                    },
                    "timestamp": {
                      "type": "string",
                      "format": "date-time",
                      "description": "Timestamp of the error"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Cron job setup instructions
 */
export const cronJobSetupInstructions = `
To set up the scheduledUpdateCheck cron job:

1. Ensure your serverless.yml file includes the following configuration:

functions:
  scheduledUpdateCheck:
    handler: src/functions/scheduledUpdateCheck.scheduledUpdateCheck
    events:
      - schedule: cron(0 */6 * * ? *)

2. Deploy your serverless application.

3. The cron job will automatically run every 6 hours (0 */6 * * ? *).

4. Make sure to set the following environment variables:
   - GITHUB_TOKEN: Your GitHub personal access token
   - DISCORD_TOKEN: Your Discord bot token
   - UPSTASH_REDIS_REST_URL: Your Upstash Redis REST URL
   - UPSTASH_REDIS_REST_TOKEN: Your Upstash Redis REST token

5. Update the following constants in the scheduledUpdateCheck.ts file:
   - GITHUB_OWNER: Your GitHub username or organization
   - GITHUB_REPO: Your repository name
   - DISCORD_CHANNEL_ID: The ID of the Discord channel where updates will be sent

The cron job will fetch the latest changelog from your GitHub repository's CHANGELOG.md file, compare it with the last sent update (stored in Redis), and send any new updates to the specified Discord channel.
`;