import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Redis } from "@upstash/redis";
import { createSlackSDK } from "@microfox/slack-web-tiny";
import dotenv from "dotenv";

dotenv.config();

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Initialize Slack SDK
const slackSDK = createSlackSDK({
  botToken: process.env.SLACK_BOT_TOKEN!,
  authType: "header",
});

const LEADERBOARD_KEY = "slack_leaderboard";

/**
 * GET endpoint to retrieve the latest leaderboard data from Redis
 */
export const getLeaderboard = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Fetch latest leaderboard data from Redis
    const leaderboardData = await redis.get(LEADERBOARD_KEY);

    if (!leaderboardData) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Leaderboard data not found" }),
      };
    }

    // If the 'sendToSlack' query parameter is present and true, send the leaderboard to Slack
    const queryParams = event.queryStringParameters || {};
    if (queryParams.sendToSlack === "true") {
      await sendLeaderboardToSlack(leaderboardData);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(leaderboardData),
    };
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

/**
 * Helper function to send the leaderboard data to a Slack channel
 */
async function sendLeaderboardToSlack(leaderboardData: any) {
  const channelId = process.env.SLACK_LEADERBOARD_CHANNEL_ID;
  if (!channelId) {
    throw new Error("SLACK_LEADERBOARD_CHANNEL_ID is not set");
  }

  const message = formatLeaderboardForSlack(leaderboardData);

  await slackSDK.sendMessage({
    channel: channelId,
    text: "Leaderboard Update",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Current Leaderboard*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
  });
}

/**
 * Helper function to format the leaderboard data for Slack message
 */
function formatLeaderboardForSlack(leaderboardData: any): string {
  // Assuming leaderboardData is an array of objects with 'name' and 'score' properties
  return leaderboardData
    .map((entry: any, index: number) => `${index + 1}. ${entry.name}: ${entry.score} points`)
    .join("\n");
}

/**
 * Documentation for the getLeaderboard API endpoint
 */
export const getLeaderboardDocs = {
  summary: "Retrieve the latest Slack leaderboard data",
  description:
    "Fetches the most recent leaderboard data from Redis and optionally sends it to a Slack channel.",
  parameters: [
    {
      name: "sendToSlack",
      in: "query",
      description: "If set to 'true', sends the leaderboard data to a Slack channel",
      required: false,
      schema: {
        type: "string",
        enum: ["true", "false"],
      },
    },
  ],
  responses: {
    "200": {
      description: "Successfully retrieved leaderboard data",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the participant",
                },
                score: {
                  type: "number",
                  description: "Score of the participant",
                },
              },
            },
          },
        },
      },
    },
    "404": {
      description: "Leaderboard data not found",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message",
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