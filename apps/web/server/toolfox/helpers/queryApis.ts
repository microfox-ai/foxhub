import { createClient } from "@supabase/supabase-js";
import { RagUpstashSdk } from "@microfox/rag-upstash";
import { FilterHelpers } from "@microfox/rag-upstash";
import { QueryApisResult } from "@/utils/services/embeddings/types";

// Supabase configuration with validation
const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY;

// Initialize RAG client

export interface ApiSearchResult {
  id: string;
  bot_project_id: string;
  base_url: string;
  endpoint_path: string;
  http_method: string;
  doc_text: string;
  stage: string;
  similarity: number;
}

export interface SearchPublicApisParams {
  query: string;
  stage?: string | null;
  limit?: number;
}

export interface SearchProjectApisParams extends SearchPublicApisParams {
  projectId: string;
}

/**
 * Search APIs using Upstash RAG and fetch full data from Supabase
 */
const searchApisWithUpstash = async (
  query: string,
  projectId?: string,
  stage: string | null = null,
  limit: number = 5,
  apiType: string | null = null
): Promise<ApiSearchResult[]> => {
  try {
    const ragClient = new RagUpstashSdk({
      upstashUrl: process.env.MICROFOX_UPSTASH_VECTOR_REST_URL || "",
      upstashToken: process.env.MICROFOX_UPSTASH_VECTOR_REST_TOKEN || "",
    });

    console.log(`Searching APIs with query: "${query}"`);
    console.log(
      `Filters: projectId=${projectId}, api_type=${apiType}, stage=${stage}`
    );

    // Build filter for Upstash RAG
    const filterBuilder = FilterHelpers;
    let filter: any;
    if (apiType) {
      filter = filterBuilder.and(filterBuilder.eq("api_type", apiType));
    }

    if (stage && stage !== "*") {
      filter = filterBuilder.and(filter, filterBuilder.eq("stage", stage));
    }

    if (projectId) {
      filter = filterBuilder.and(
        filter,
        filterBuilder.eq("package_name", projectId)
      );
    }

    const results: ApiSearchResult[] = [];

    // Search in global endpoints namespace
    const endpointNamespace = "api-embeddings";
    console.log(`Searching endpoints in namespace: ${endpointNamespace}`);

    const endpointResults = await ragClient.queryDocsFromRAG(
      {
        data: query,
        topK: limit,
        filter: filter,
        includeData: false,
        includeMetadata: true,
      },
      endpointNamespace
    );

    // Fetch full data from Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    for (const ragResult of endpointResults) {
      if (ragResult.metadata?.supabase_id) {
        const { data: supabaseData, error } = await supabase
          .from("api_embeddings")
          .select("*")
          .eq("id", ragResult.metadata.supabase_id)
          .single();

        if (!error && supabaseData) {
          results.push({
            id: supabaseData.id,
            bot_project_id: supabaseData.package_name,
            base_url: supabaseData.base_url,
            endpoint_path: supabaseData.endpoint_path,
            http_method: supabaseData.http_method,
            doc_text: supabaseData.doc_text,
            stage: supabaseData.stage,
            similarity:
              (ragResult as any).score || (ragResult as any).similarity || 0,
          });
        }
      }
    }

    // Sort by similarity and limit results
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  } catch (error) {
    console.error("Error searching APIs with Upstash:", error);
    throw error;
  }
};

/**
 * Perform semantic search on APIs by project
 */
const searchProjectApis = async ({
  projectId,
  query,
  stage = null,
  limit = 5,
}: {
  projectId: string;
  query: string;
  stage?: string | null;
  limit?: number;
}): Promise<ApiSearchResult[]> => {
  try {
    // Validate inputs
    if (
      !projectId ||
      typeof projectId !== "string" ||
      projectId.trim() === ""
    ) {
      throw new Error("Project ID is required and must be a non-empty string");
    }

    if (!query || typeof query !== "string" || query.trim() === "") {
      throw new Error("Query is required and must be a non-empty string");
    }

    if (limit < 1 || limit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    console.log(
      `🔍 Embedding query for project "${projectId}": "${query.substring(0, 100)}${query.length > 100 ? "..." : ""}"`
    );

    console.log(
      `🤖 Project API search in "${projectId}"${stage ? (stage === "*" ? " (all stages)" : ` with stage "${stage}"`) : ""}…`
    );

    const results = await searchApisWithUpstash(query, projectId, stage, limit);

    console.log(`✅ Found ${results.length} APIs for project "${projectId}"`);
    return results;
  } catch (error) {
    const errorMessage = `Failed to search project APIs: ${error instanceof Error ? error.message : String(error)}`;
    console.error("❌", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Perform semantic search on public APIs
 */
const searchPublicApis = async ({
  query,
  stage = null,
  limit = 5,
}: SearchPublicApisParams): Promise<ApiSearchResult[]> => {
  try {
    // Validate inputs
    if (!query || typeof query !== "string" || query.trim() === "") {
      throw new Error("Query is required and must be a non-empty string");
    }

    if (limit < 1 || limit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    console.log(
      `🔍 Embedding query for public APIs: "${query.substring(0, 100)}${query.length > 100 ? "..." : ""}"`
    );

    console.log(
      `🌍 Public API search${stage ? (stage === "*" ? " (all stages)" : ` with stage "${stage}"`) : ""}…`
    );

    const results = await searchApisWithUpstash(query, undefined, stage, limit);

    console.log(`✅ Found ${results.length} public APIs`);
    return results;
  } catch (error) {
    const errorMessage = `Failed to search public APIs: ${error instanceof Error ? error.message : String(error)}`;
    console.error("❌", errorMessage);
    throw new Error(errorMessage);
  }
};

export interface QueryApisParams {
  query: string;
  api_type?: string | null;
  package_name?: string | null;
  match_count?: number;
  match_threshold?: number;
}

const queryApis = async ({
  query,
  api_type = null,
  package_name = null,
  match_count = 5,
  match_threshold = 0.1,
}: QueryApisParams): Promise<QueryApisResult[]> => {
  try {
    const ragClient = new RagUpstashSdk({
      upstashUrl: process.env.MICROFOX_UPSTASH_VECTOR_REST_URL || "",
      upstashToken: process.env.MICROFOX_UPSTASH_VECTOR_REST_TOKEN || "",
    });
    console.time("Time: RAG - search");

    // Build filter for Upstash RAG
    const filterBuilder = FilterHelpers;
    let filter: any;
    if (api_type) {
      filter = filterBuilder.and(filterBuilder.eq("api_type", api_type));
    }

    if (package_name) {
      filter = filterBuilder.and(
        filter,
        filterBuilder.eq("package_name", package_name)
      );
    }

    const results: QueryApisResult[] = [];

    // Search in global endpoints namespace
    const endpointNamespace = "api-embeddings";
    console.log(`Searching endpoints in namespace: ${endpointNamespace}`);

    console.time("Time: RAG - UpstashQuery");
    const endpointResults = await ragClient.queryDocsFromRAG(
      {
        data: query,
        topK: match_count,
        filter: filter,
        includeData: false,
        includeMetadata: true,
      },
      endpointNamespace
    );
    console.timeEnd("Time: RAG - UpstashQuery");

    // Fetch full data from Supabase using Promise.all for parallel execution
    console.time("Time: RAG - SupabaseQuery");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

    // Create array of promises for parallel execution
    const supabasePromises = endpointResults
      .filter((ragResult) => ragResult.metadata?.supabase_id)
      .map(async (ragResult) => {
        const supabaseId = ragResult.metadata?.supabase_id;
        if (!supabaseId) return null;

        const { data: supabaseData, error } = await supabase
          .from("api_embeddings")
          .select("*")
          .eq("id", supabaseId)
          .single();

        if (!error && supabaseData) {
          const similarity =
            (ragResult as any).score || (ragResult as any).similarity || 0;

          // Apply similarity threshold
          if (similarity >= match_threshold) {
            return {
              id: supabaseData.id,
              name: supabaseData.package_name,
              package_name: supabaseData.package_name,
              base_url: supabaseData.base_url,
              endpoint_path: supabaseData.endpoint_path,
              http_method: supabaseData.http_method,
              similarity: similarity,
              api_type: supabaseData.api_type,
              schema_path: supabaseData.schema_path || "",
              created_at: supabaseData.created_at,
              updated_at: supabaseData.updated_at,
              metadata: supabaseData.metadata || {
                package_name: supabaseData.package_name,
                function_type: "MIXED",
                openApiSchema: {},
                endpointSchema: {},
              },
            };
          }
        }
        return null;
      });

    // Execute all promises in parallel
    const supabaseResults = await Promise.all(supabasePromises);

    // Filter out null results and add to results array
    results.push(...supabaseResults.filter((result) => result !== null));

    console.timeEnd("Time: RAG - SupabaseQuery");

    if (results.length === 0) {
      console.log("No similar packages found.");
      return [];
    }
    console.timeEnd("Time: RAG - search");
    return results.sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error("An unexpected error occurred:", err);
    throw err;
  }
};

export { searchProjectApis, searchPublicApis, queryApis };
