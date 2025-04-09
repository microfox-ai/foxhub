import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
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
 * Calculates the Slack leaderboard data, sends it to a Slack channel, and stores it in Redis
 */
export const calculateAndSendLeaderboard = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse the request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { channelId } = body;

    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    // 1. Fetch data from Slack API
    const leaderboardData = await fetchSlackData();

    // 2. Process data to calculate leaderboard
    const leaderboard = calculateLeaderboard(leaderboardData);

    // 3. Store leaderboard in Redis
    await storeLeaderboardInRedis(leaderboard);

    // 4. Send leaderboard to Slack channel
    await sendLeaderboardToSlack(channelId, leaderboard);

    // 5. Return success response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Leaderboard calculated and sent successfully",
        leaderboard,
      }),
    };
  } catch (error) {
    console.error("Error calculating and sending leaderboard:", error);
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

async function fetchSlackData(): Promise<any[]> {
  // TODO: Implement actual data fetching from Slack API
  // This is a placeholder implementation
  return [
    { userId: "U1", username: "user1", activity: 10 },
    { userId: "U2", username: "user2", activity: 15 },
    { userId: "U3", username: "user3", activity: 8 },
  ];
}

function calculateLeaderboard(data: any[]): LeaderboardEntry[] {
  return data
    .map((entry) => ({
      userId: entry.userId,
      username: entry.username,
      score: entry.activity,
    }))
    .sort((a, b) => b.score - a.score);
}

async function storeLeaderboardInRedis(leaderboard: LeaderboardEntry[]): Promise<void> {
  await redis.set('slack_leaderboard', JSON.stringify(leaderboard), { ex: 86400 }); // Expire after 24 hours
}

async function sendLeaderboardToSlack(channelId: string, leaderboard: LeaderboardEntry[]): Promise<void> {
  const leaderboardText = leaderboard
    .map((entry, index) => `${index + 1}. ${entry.username}: ${entry.score} points`)
    .join('\n');

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
          text: leaderboardText,
        },
      },
    ],
  });
}

/**
 * Documentation for the calculateAndSendLeaderboard API endpoint
 */
export const calculateAndSendLeaderboardDocs = {
  summary: "Calculate and send Slack leaderboard",
  description: "Calculates the Slack leaderboard data, sends it to a Slack channel, and stores it in Redis",
  parameters: [
    {
      name: "channelId",
      in: "body",
      description: "The ID of the Slack channel to send the leaderboard to",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    "200": {
      description: "Successfully calculated and sent leaderboard",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              leaderboard: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    userId: {
                      type: "string",
                      description: "Slack user ID",
                    },
                    username: {
                      type: "string",
                      description: "Slack username",
                    },
                    score: {
                      type: "number",
                      description: "User's score",
                    },
                  },
                },
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