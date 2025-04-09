import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Redis key for storing the leaderboard data
export const leaderboardRedisKey = "slack_leaderboard";

// Interface for leaderboard data
interface LeaderboardData {
  rankings: Array<{
    userId: string;
    username: string;
    score: number;
  }>;
  lastUpdated: string;
}

/**
 * Stores the leaderboard data in Redis
 * @param data LeaderboardData to be stored
 */
export const storeLeaderboard = async (data: LeaderboardData): Promise<void> => {
  if (!data || !Array.isArray(data.rankings) || !data.lastUpdated) {
    throw new Error("Invalid leaderboard data");
  }
  
  await redis.set(leaderboardRedisKey, JSON.stringify(data));
};

/**
 * Retrieves the latest leaderboard data from Redis
 * @returns Promise<LeaderboardData | null>
 */
export const getLeaderboard = async (): Promise<LeaderboardData | null> => {
  const data = await redis.get<string>(leaderboardRedisKey);
  
  if (!data) {
    return null;
  }
  
  try {
    const parsedData = JSON.parse(data) as LeaderboardData;
    if (!Array.isArray(parsedData.rankings) || !parsedData.lastUpdated) {
      throw new Error("Invalid leaderboard data structure");
    }
    return parsedData;
  } catch (error) {
    console.error("Error parsing leaderboard data:", error);
    return null;
  }
};

/**
 * Calculates and stores the leaderboard data in Redis
 * @param calculatedData LeaderboardData calculated from Slack API
 * @returns Promise<void>
 */
export const calculateAndStoreLeaderboard = async (calculatedData: LeaderboardData): Promise<void> => {
  if (!calculatedData || !Array.isArray(calculatedData.rankings) || !calculatedData.lastUpdated) {
    throw new Error("Invalid calculated leaderboard data");
  }
  
  await storeLeaderboard({
    rankings: calculatedData.rankings,
    lastUpdated: new Date().toISOString(),
  });
};