import { APIGatewayProxyResult } from "aws-lambda";
import { Octokit } from "@microfox/github";
import { createDiscordSdk } from "@microfox/discord-sdk";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

// Initialize Octokit
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Discord SDK
const discordSdk = createDiscordSdk({
  botToken: process.env.DISCORD_TOKEN,
});

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Configuration
const GITHUB_OWNER = "your-github-username";
const GITHUB_REPO = "your-repo-name";
const DISCORD_CHANNEL_ID = "your-discord-channel-id";
const REDIS_KEY = "last_changelog_update";

interface ChangelogEntry {
  version: string;
  changes: string[];
}

/**
 * Parse the CHANGELOG.md content and extract the latest entries
 * @param content The content of the CHANGELOG.md file
 * @returns An array of ChangelogEntry objects
 */
function parseChangelog(content: string): ChangelogEntry[] {
  const lines = content.split("\n");
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      const version = line.substring(3).trim();
      currentEntry = { version, changes: [] };
    } else if (currentEntry && line.startsWith("- ")) {
      currentEntry.changes.push(line.substring(2).trim());
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Format changelog entries for Discord message
 * @param entries An array of ChangelogEntry objects
 * @returns A formatted string for Discord message
 */
function formatChangelogForDiscord(entries: ChangelogEntry[]): string {
  return entries
    .map(
      (entry) => `**${entry.version}**\n${entry.changes.map((change) => `• ${change}`).join("\n")}`
    )
    .join("\n\n");
}

/**
 * Scheduled function to check for updates and send them to Discord
 */
export const scheduledUpdateCheck = async (): Promise<APIGatewayProxyResult> => {
  try {
    // Fetch the CHANGELOG.md content
    const { data: changelogContent } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "CHANGELOG.md",
    });

    if (!("content" in changelogContent)) {
      throw new Error("Unable to fetch CHANGELOG.md content");
    }

    const decodedContent = Buffer.from(changelogContent.content, "base64").toString("utf-8");
    const changelogEntries = parseChangelog(decodedContent);

    // Get the last update timestamp from Redis
    const lastUpdate = await redis.get<string>(REDIS_KEY);
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : new Date(0);

    // Filter new entries
    const newEntries = changelogEntries.filter((entry) => {
      const entryDate = new Date(entry.version);
      return entryDate > lastUpdateDate;
    });

    if (newEntries.length > 0) {
      // Format the message for Discord
      const message = `📢 New app updates:\n\n${formatChangelogForDiscord(newEntries)}`;

      // Send the message to Discord
      await discordSdk.sendMessage({
        content: message,
        channelId: DISCORD_CHANNEL_ID,
      });

      // Update the last update timestamp in Redis
      await redis.set(REDIS_KEY, new Date().toISOString());

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Updates sent to Discord successfully",
          updatesCount: newEntries.length,
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "No new updates found",
        }),
      };
    }
  } catch (error) {
    console.error("Error in scheduledUpdateCheck:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * OpenAPI 3.0.1 documentation for the scheduled update check endpoint
 */
export const scheduledUpdateCheckDocs = {
  title: "Scheduled Update Check",
  description:
    "Cron job that runs every 6 hours to check for new app updates and send them to Discord",
  method: "GET",
  path: "/cron/scheduled-update-check",
  schedule: "cron(0 */6 * * ? *)",
  responses: {
    200: {
      description: "Job completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Status message",
              },
              updatesCount: {
                type: "number",
                description: "Number of new updates sent (if any)",
              },
            },
          },
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message",
              },
              timestamp: {
                type: "string",
                format: "date-time",
                description: "When the error occurred",
              },
            },
          },
        },
      },
    },
  },
};