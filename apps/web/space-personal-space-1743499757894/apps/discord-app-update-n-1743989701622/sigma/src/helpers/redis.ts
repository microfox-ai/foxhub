import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Key for storing the timestamp of the last sent update
const LAST_SENT_UPDATE_KEY = "last_sent_update_timestamp";

/**
 * Retrieves the timestamp of the last sent update
 * @returns {Promise<string | null>} The timestamp of the last sent update or null if not found
 */
export const getLastSentUpdate = async (): Promise<string | null> => {
  return await redis.get<string>(LAST_SENT_UPDATE_KEY);
};

/**
 * Sets the timestamp of the last sent update
 * @param {string} timestamp - The timestamp to set
 * @returns {Promise<void>}
 */
export const setLastSentUpdate = async (timestamp: string): Promise<void> => {
  if (timestamp) {
    await redis.set(LAST_SENT_UPDATE_KEY, timestamp);
  }
};

/**
 * Helper function to store any key-value pair in Redis
 * @param {string} key - The key to store
 * @param {any} value - The value to store
 * @returns {Promise<void>}
 */
export const setRedisValue = async (key: string, value: any): Promise<void> => {
  if (key && value !== undefined && value !== null) {
    await redis.set(key, JSON.stringify(value));
  }
};

/**
 * Helper function to retrieve any value from Redis by key
 * @param {string} key - The key to retrieve
 * @returns {Promise<any | null>} The retrieved value or null if not found
 */
export const getRedisValue = async (key: string): Promise<any | null> => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

/**
 * Helper function to delete a key from Redis
 * @param {string} key - The key to delete
 * @returns {Promise<void>}
 */
export const deleteRedisKey = async (key: string): Promise<void> => {
  if (key) {
    await redis.del(key);
  }
};