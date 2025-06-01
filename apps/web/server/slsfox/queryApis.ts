import { createClient } from '@supabase/supabase-js';
import { embed } from '@/utils/services/embeddings/geminiEmbed';

// Supabase configuration with validation
const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY;

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
 * Perform semantic search on APIs by project
 */
const searchProjectApis = async ({
    projectId,
    query,
    stage = null,
    limit = 5
}: {
    projectId: string;
    query: string;
    stage?: string | null;
    limit?: number;
}): Promise<ApiSearchResult[]> => {
    try {
        // Validate inputs
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
            throw new Error("Project ID is required and must be a non-empty string");
        }

        if (!query || typeof query !== 'string' || query.trim() === '') {
            throw new Error("Query is required and must be a non-empty string");
        }

        if (limit < 1 || limit > 100) {
            throw new Error("Limit must be between 1 and 100");
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

        console.log(`🔍 Embedding query for project "${projectId}": "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

        let qEmb: number[];
        try {
            qEmb = await embed(query);
            console.log(`🧠 Query embedding obtained (${qEmb.length} dimensions)`);
        } catch (embedError) {
            const errorMsg = `Failed to generate embedding: ${embedError instanceof Error ? embedError.message : String(embedError)}`;
            console.error("❌", errorMsg);
            throw new Error(errorMsg);
        }

        console.log(`🤖 Project API search in "${projectId}"${stage ? (stage === '*' ? ' (all stages)' : ` with stage "${stage}"`) : ''}…`);

        const { data, error } = await supabase.rpc('match_apis_by_project', {
            query_embedding: qEmb,
            project_id: projectId,
            k: limit,
            stage_filter: stage === '*' ? null : stage,
        });

        if (error) {
            console.error("❌ Supabase RPC error:", error);
            throw new Error(`Database search failed: ${error.message}`);
        }

        const results = data || [];
        console.log(`✅ Found ${results.length} APIs for project "${projectId}"`);
        return results;

    } catch (error) {
        const errorMessage = `Failed to search project APIs: ${error instanceof Error ? error.message : String(error)}`;
        console.error("❌", errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Perform semantic search on public APIs
 */
const searchPublicApis = async ({
    query,
    stage = null,
    limit = 5
}: SearchPublicApisParams): Promise<ApiSearchResult[]> => {
    try {
        // Validate inputs
        if (!query || typeof query !== 'string' || query.trim() === '') {
            throw new Error("Query is required and must be a non-empty string");
        }

        if (limit < 1 || limit > 100) {
            throw new Error("Limit must be between 1 and 100");
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

        console.log(`🔍 Embedding query for public APIs: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

        let qEmb: number[];
        try {
            qEmb = await embed(query);
            console.log(`🧠 Query embedding obtained (${qEmb.length} dimensions)`);
        } catch (embedError) {
            const errorMsg = `Failed to generate embedding: ${embedError instanceof Error ? embedError.message : String(embedError)}`;
            console.error("❌", errorMsg);
            throw new Error(errorMsg);
        }

        console.log(`🌍 Public API search${stage ? (stage === '*' ? ' (all stages)' : ` with stage "${stage}"`) : ''}…`);

        const { data, error } = await supabase.rpc('match_apis', {
            query_embedding: qEmb,
            k: limit,
            stage_filter: stage === '*' ? null : stage,
            public_only: true,
        });

        if (error) {
            console.error("❌ Supabase RPC error:", error);
            throw new Error(`Database search failed: ${error.message}`);
        }

        const results = data || [];
        console.log(`✅ Found ${results.length} public APIs`);
        return results;

    } catch (error) {
        const errorMessage = `Failed to search public APIs: ${error instanceof Error ? error.message : String(error)}`;
        console.error("❌", errorMessage);
        throw new Error(errorMessage);
    }
}

export { searchProjectApis, searchPublicApis };