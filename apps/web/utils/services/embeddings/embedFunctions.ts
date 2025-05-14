import { createClient } from '@supabase/supabase-js';
import { embed } from './geminiEmbed';
import { OpenAPIDoc } from '@/utils/services/OpenAPIToolsClient'
import { TaskStructure } from '@/server/convertfox/types'
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type EmbedApiEndpointsArgs = {
    taskStructure: TaskStructure,
    docData: OpenAPIDoc,
    botProjectId: string | null,
    originClientRequestId: string | null,
    userId: string | null
}

export async function embedApiEndpoints({
    taskStructure,
    docData,
    botProjectId,
    originClientRequestId,
    userId
}: EmbedApiEndpointsArgs) {
    try {
        if (!docData || !docData.paths) {
            throw new Error('Invalid OpenAPI document: missing paths');
        }

        if (!taskStructure) {
            throw new Error('Invalid task structure: data is missing');
        }

        // helper to find cron job for an endpoint path
        const findCron = (path: string) =>
            taskStructure.cronJobs.find(c => path.endsWith(c.name) || path.includes(c.name));

        // helper to find lambda function metadata
        const findLambda = (path: string) =>
            taskStructure.lambdaFunctions.find(f => f.path === path);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { path: string, method: string, error: any }[]
        };

        for (const [path, methods] of Object.entries(docData.paths)) {
            for (const [method, op] of Object.entries(methods)) {
                try {
                    // build doc_text
                    let docText = `ENDPOINT_PATH: ${method.toUpperCase()} ${path}\n`;
                    if (op.summary) docText += `SUMMARY: ${op.summary}\n`;
                    if (op.description) docText += `DESCRIPTION: ${op.description}\n`;

                    const cron = findCron(path);
                    if (cron) {
                        docText += `\nCRON_JOB:\n`;
                        docText += `  Name: ${cron.name}\n`;
                        docText += `  Expression: ${cron.cronExpression}\n`;
                        docText += `  Brief: ${cron.brief}\n`;
                        docText += `  Packages: ${cron.packagesUsed.join(', ')}\n`;
                        docText += `  End Result: ${cron.endResult}\n`;
                    }

                    const fn = findLambda(path);
                    if (fn) {
                        docText += `\nLAMBDA_FUNCTION:\n`;
                        docText += `  Name: ${fn.name}\n`;
                        docText += `  Path: ${fn.path}\n`;
                        docText += `  Method: ${fn.method}\n`;
                        docText += `  Description: ${fn.description}\n`;
                        docText += `  Brief: ${fn.brief}\n`;
                        docText += `  End Result: ${fn.endResult}\n`;
                        docText += `  Packages: ${fn.packagesUsed.join(', ')}\n`;
                        docText += `  Interaction: ${fn.interactionType.join(', ')}\n`;
                    }

                    if (op.requestBody?.content?.['application/json']?.schema) {
                        const schema = JSON.stringify(op.requestBody.content['application/json'].schema);
                        docText += `\nREQUEST_SCHEMA: ${schema}\n`;
                    }

                    docText += `\nRESPONSES:\n`;
                    for (const [status, resp] of Object.entries(op.responses)) {
                        if (resp?.content?.['application/json']?.schema) {
                            const schema = JSON.stringify(resp.content['application/json'].schema);
                            docText += `  ${status} → ${schema}\n`;
                        }
                    }

                    // embed and upsert
                    let embedding;
                    try {
                        embedding = await embed(docText);
                        if (!embedding) {
                            throw new Error('Failed to generate embedding');
                        }
                    } catch (embedError) {
                        console.error(`Embedding error for ${method.toUpperCase()} ${path}:`, embedError);
                        results.failed++;
                        results.errors.push({ path, method, error: embedError });
                        continue;
                    }

                    const { error } = await supabase
                        .from('api_embeddings')
                        .upsert({
                            bot_project_id: botProjectId,
                            origin_client_request_id: originClientRequestId,
                            user_id: userId,
                            base_url: docData.servers?.[0]?.url || null,
                            schema_path: '/docs.json',
                            endpoint_path: path,
                            http_method: method.toUpperCase(),
                            doc_text: docText,
                            embedding,
                            is_public: false,
                            stage: 'STAGING',
                            metadata: {
                                cron: cron || null,
                                lambda: fn || null
                            }
                        }, { onConflict: 'bot_project_id,endpoint_path,http_method' });

                    if (error) {
                        console.error(`Failed to upsert ${method.toUpperCase()} ${path}:`, error);
                        results.failed++;
                        results.errors.push({ path, method, error });
                    } else {
                        console.log(`Upserted embedding for ${method.toUpperCase()} ${path}`);
                        results.success++;
                    }
                } catch (endpointError) {
                    console.error(`Processing error for ${method.toUpperCase()} ${path}:`, endpointError);
                    results.failed++;
                    results.errors.push({ path, method, error: endpointError });
                }
            }
        }

        console.log(`Embedding complete. Success: ${results.success}, Failed: ${results.failed}`);
        if (results.failed > 0) {
            console.error(`Failed endpoints:`, results.errors);
        }
        return results;
    } catch (error) {
        console.error('Fatal error in embedApiEndpoints:', error);
        throw error;
    }
}

export async function deleteEmbedding(origin_client_request_id: string) {
    try {
        const { error } = await supabase
            .from('api_embeddings')
            .delete()
            .eq('origin_client_request_id', origin_client_request_id);

        if (error) {
            console.error('Failed to delete embedding:', error);
        }
    } catch (error) {
        console.error('Failed to delete embedding:', error);
    }
}
