import { APP_BASE_URL } from "@/utils/constants/appInfo";
import createClient from "openapi-fetch";

/**
 * Creates a type-safe API client for a specific agent.
 *
 * This client uses the central gateway for requests. It requires TypeScript
 * types generated from the agent's OpenAPI schema to provide full type safety
 * and autocompletion.
 *
 * @param agentName The name of the agent, e.g., "sparkboard".
 * @returns An `openapi-fetch` client instance.
 *
 * @example
 * // 1. Generate types from your schema (e.g., in a build step)
 * // npx openapi-typescript http://localhost:3002/openapi.json -o apps/web/types/sparkboard.d.ts
 *
 * // 2. Import the generated types and create the client
 * import { paths } from "@/types/sparkboard";
 * const sparkboardClient = createAgentClient<paths>("sparkboard");
 *
 * // 3. Make a type-safe API call
 * const { data, error } = await sparkboardClient.GET("/search", {
 *   params: { query: { q: "hello" } }
 * });
 */
export function createAgentClient<T extends {}>(agentName: string) {
  const client = createClient<T>({
    // All requests from this client will be prefixed with the gateway path
    baseUrl: `${APP_BASE_URL}/api/subdomain/agents/${agentName}`,
  });

  return client;
}
