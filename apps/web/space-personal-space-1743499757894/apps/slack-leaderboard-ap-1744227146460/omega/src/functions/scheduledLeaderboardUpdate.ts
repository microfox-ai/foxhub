import { APIGatewayProxyResult } from "aws-lambda";
import { createSlackSDK } from '@microfox/slack-web-tiny';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Slack SDK
const slackSDK = createSlackSDK({
  botToken: process.env.SLACK_BOT_TOKEN ?? '',
  authType: 'header',
});

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
}

/**
 * Calculates the leaderboard based on user activity in Slack
 * @returns Promise<LeaderboardEntry[]>
 */
async function calculateLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: Implement the logic to calculate the leaderboard
  // This would involve fetching data from Slack API, processing it, and creating a leaderboard
  // For now, we'll return a mock leaderboard
  return [
    { userId: 'U1234', username: 'user1', score: 100 },
    { userId: 'U5678', username: 'user2', score: 90 },
    { userId: 'U9012', username: 'user3', score: 80 },
  ];
}

/**
 * Formats the leaderboard data into a Slack message
 * @param leaderboard The calculated leaderboard data
 * @returns Formatted Slack message
 */
function formatLeaderboardMessage(leaderboard: LeaderboardEntry[]): string {
  let message = "*Current Leaderboard*\n\n";
  leaderboard.forEach((entry, index) => {
    message += `${index + 1}. ${entry.username}: ${entry.score} points\n`;
  });
  return message;
}

/**
 * Sends the leaderboard message to a specified Slack channel
 * @param message The formatted leaderboard message
 * @returns Promise<void>
 */
async function sendLeaderboardToSlack(message: string): Promise<void> {
  const channelId = process.env.SLACK_LEADERBOARD_CHANNEL_ID;
  if (!channelId) {
    throw new Error('SLACK_LEADERBOARD_CHANNEL_ID is not set');
  }

  await slackSDK.sendMessage({
    channel: channelId,
    text: message,
  });
}

/**
 * Stores the leaderboard data in Redis
 * @param leaderboard The calculated leaderboard data
 * @returns Promise<void>
 */
async function storeLeaderboardInRedis(leaderboard: LeaderboardEntry[]): Promise<void> {
  await redis.set('slack_leaderboard', JSON.stringify(leaderboard));
}

/**
 * Scheduled function to update the Slack leaderboard
 * @returns Promise<APIGatewayProxyResult>
 */
export const scheduledLeaderboardUpdate = async (): Promise<APIGatewayProxyResult> => {
  try {
    // Calculate the leaderboard
    const leaderboard = await calculateLeaderboard();

    // Format the leaderboard message
    const message = formatLeaderboardMessage(leaderboard);

    // Send the leaderboard to Slack
    await sendLeaderboardToSlack(message);

    // Store the leaderboard in Redis
    await storeLeaderboardInRedis(leaderboard);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Leaderboard updated successfully",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Error updating leaderboard:", error);
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
 * OpenAPI 3.0.1 documentation for the scheduled leaderboard update function
 */
export const scheduledLeaderboardUpdateDocs = {
  title: "Scheduled Leaderboard Update",
  description: "Periodically calculates and updates the Slack leaderboard",
  method: "GET",
  path: "/cron/update-leaderboard",
  schedule: "cron(0 0 * * ? *)", // Run daily at midnight UTC
  responses: {
    200: {
      description: "Leaderboard updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              timestamp: {
                type: "string",
                format: "date-time",
                description: "Timestamp of the update",
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