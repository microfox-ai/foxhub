import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const getExternalDataRedisKey = "external_data_pagination";
export const getChangelogRedisKey = "changelog_state";

interface PaginationState {
  page: number;
  limit: number;
  lastUpdated: string;
}

interface ChangelogState {
  lastFetchedSha: string;
  lastUpdated: string;
}

export const getPaginationState = async (
  key: string
): Promise<PaginationState> => {
  const state = await redis.get<PaginationState>(key);
  if (!state) {
    // Initialize with default values if not exists
    const initialState: PaginationState = {
      page: 1,
      limit: 10,
      lastUpdated: new Date().toISOString(),
    };
    await redis.set(key, initialState);
    return initialState;
  }
  return state;
};

export const incrementPaginationState = async (key: string): Promise<void> => {
  const state = await getPaginationState(key);
  const updatedState: PaginationState = {
    ...state,
    page: state.page + 1,
    lastUpdated: new Date().toISOString(),
  };
  await redis.set(key, updatedState);
};

export const getChangelogState = async (): Promise<ChangelogState> => {
  const state = await redis.get<ChangelogState>(getChangelogRedisKey);
  if (!state) {
    // Initialize with default values if not exists
    const initialState: ChangelogState = {
      lastFetchedSha: "",
      lastUpdated: new Date().toISOString(),
    };
    await redis.set(getChangelogRedisKey, initialState);
    return initialState;
  }
  return state;
};

export const updateChangelogState = async (lastFetchedSha: string): Promise<void> => {
  const updatedState: ChangelogState = {
    lastFetchedSha,
    lastUpdated: new Date().toISOString(),
  };
  await redis.set(getChangelogRedisKey, updatedState);
};

export const getLastFetchedSha = async (): Promise<string> => {
  const state = await getChangelogState();
  return state.lastFetchedSha;
};

export const setLastFetchedSha = async (sha: string): Promise<void> => {
  if (sha) {
    await updateChangelogState(sha);
  }
};