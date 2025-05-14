import { createClient } from '@supabase/supabase-js';
import { embed } from './geminiEmbed';
import { OpenAPIDoc } from '@/utils/services/OpenAPIToolsClient'
import { TaskStructure } from '@/server/convertfox/types'

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

type EmbedApiEndpointsArgs = {
    taskStructure: TaskStructure,
    docData: OpenAPIDoc,
    botProjectId: string | null,
    originClientRequestId: string | null,
    userId: string | null,
    stage: string | null,
    base_url: string | null
}

export async function embedApiEndpoints({
    taskStructure,
    docData,
    botProjectId,
    originClientRequestId,
    userId,
    stage,
    base_url
}: EmbedApiEndpointsArgs) {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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

                    const { data: existing, error: fetchError } = await supabase
                        .from('api_embeddings')
                        .select('id')
                        .match({
                            bot_project_id: botProjectId,
                            origin_client_request_id: originClientRequestId,
                            base_url: base_url,
                            endpoint_path: path,
                            http_method: method.toUpperCase()
                        })
                        .maybeSingle();

                    if (fetchError) {
                        console.error(`Fetch error for ${method} ${path}:`, fetchError);
                        results.failed++;
                        results.errors.push({ path, method, error: fetchError });
                        continue;
                    }

                    if (existing) {
                        // 2) Update existing
                        const { error: updateError } = await supabase
                            .from('api_embeddings')
                            .update({
                                doc_text: docText,
                                embedding,
                                metadata: { cron, lambda: fn || null },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);

                        if (updateError) {
                            console.error(`Update error for ${method} ${path}:`, updateError);
                            results.failed++;
                            results.errors.push({ path, method, error: updateError });
                        } else {
                            console.log(`Updated embedding for ${method} ${path}`);
                            results.success++;
                        }
                    } else {
                        // 3) Insert new
                        const { error: insertError } = await supabase
                            .from('api_embeddings')
                            .insert({
                                bot_project_id: botProjectId,
                                origin_client_request_id: originClientRequestId,
                                user_id: userId,
                                base_url: base_url,
                                schema_path: '/docs.json',
                                endpoint_path: path,
                                http_method: method.toUpperCase(),
                                doc_text: docText,
                                embedding,
                                is_public: false,
                                stage: stage,
                                metadata: {
                                    cron: cron || null,
                                    lambda: fn || null
                                }
                            });

                        if (insertError) {
                            console.error(`Insert error for ${method} ${path}:`, insertError);
                            results.failed++;
                            results.errors.push({ path, method, error: insertError });
                        } else {
                            console.log(`Inserted embedding for ${method} ${path}`);
                            results.success++;
                        }
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
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
