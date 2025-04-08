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
 * @returns {Promise<string | null>} The timestamp of the last sent update or null if not set
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
  await redis.set(LAST_SENT_UPDATE_KEY, timestamp);
};

/**
 * Helper function to store the latest changelog entry
 * @param {string} entry - The changelog entry to store
 * @returns {Promise<void>}
 */
export const storeLatestChangelogEntry = async (entry: string): Promise<void> => {
  await redis.set("latest_changelog_entry", entry);
};

/**
 * Helper function to retrieve the latest stored changelog entry
 * @returns {Promise<string | null>} The latest changelog entry or null if not set
 */
export const getLatestChangelogEntry = async (): Promise<string | null> => {
  return await redis.get<string>("latest_changelog_entry");
};

/**
 * Helper function to store the Discord message ID of the last sent update
 * @param {string} messageId - The Discord message ID to store
 * @returns {Promise<void>}
 */
export const storeLastSentMessageId = async (messageId: string): Promise<void> => {
  await redis.set("last_sent_discord_message_id", messageId);
};

/**
 * Helper function to retrieve the Discord message ID of the last sent update
 * @returns {Promise<string | null>} The Discord message ID or null if not set
 */
export const getLastSentMessageId = async (): Promise<string | null> => {
  return await redis.get<string>("last_sent_discord_message_id");
};