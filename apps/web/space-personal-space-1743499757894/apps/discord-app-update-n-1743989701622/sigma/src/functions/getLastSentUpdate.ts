import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LAST_UPDATE_KEY = "last_sent_update_timestamp";

/**
 * GET endpoint to retrieve the timestamp of the last sent update
 */
export const getLastSentUpdate = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Retrieve the last sent update timestamp from Redis
    const lastSentUpdate = await redis.get(LAST_UPDATE_KEY);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        lastSentUpdate: lastSentUpdate || null,
      }),
    };
  } catch (error) {
    console.error("Error retrieving last sent update:", error);
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
 * Documentation for the getLastSentUpdate endpoint
 */
export const getLastSentUpdateDocs = {
  instructions: `
This is a simple GET endpoint that retrieves the timestamp of the last sent update from Redis.
No specific setup is required for this endpoint.
`,
  summary: "Retrieve the timestamp of the last sent update",
  description: "Fetches the timestamp of the last sent update from Redis storage.",
  parameters: [],
  responses: {
    "200": {
      description: "Successfully retrieved the last sent update timestamp",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              lastSentUpdate: {
                type: "string",
                nullable: true,
                description: "Timestamp of the last sent update, or null if not set",
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