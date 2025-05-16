import { createClient } from '@supabase/supabase-js';
import { embed } from './geminiEmbed';
import { OpenAPIDoc } from '@/utils/services/OpenAPIToolsClient'
import { TaskStructure } from '@/server/convertfox/types'

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

type EmbedApiEndpointsArgs = {
    taskStructure?: TaskStructure,
    docData: OpenAPIDoc,
    botProjectId?: string | null,
    originClientRequestId?: string | null,
    userId?: string | null,
    stage: string | null,
    base_url: string | null,
    schema_path: string | null,
}

export async function embedApiEndpoints({
    taskStructure,
    docData,
    botProjectId,
    originClientRequestId,
    userId,
    stage,
    base_url,
    schema_path
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
        const findCron = (path: string) => {
            // Normalize path by removing leading/trailing slashes
            const normalizedPath = path.replace(/^\/|\/$/g, '');

            if (!taskStructure) {
                return null;
            }
            return taskStructure.cronJobs.find(c => {
                // More flexible matching
                const cronName = c.name.replace(/^\/|\/$/g, '');
                return normalizedPath === cronName ||
                    normalizedPath.endsWith(`/${cronName}`) ||
                    normalizedPath.startsWith(`${cronName}/`) ||
                    normalizedPath.includes(`/${cronName}/`);
            });
        };

        // helper to find lambda function metadata with more flexible matching
        const findLambda = (path: string, method: string) => {
            // Normalize path and method for comparison
            const normalizedPath = path.replace(/^\/|\/$/g, '');
            const normalizedMethod = method.toUpperCase();

            if (!taskStructure) {
                return null;
            }
            return taskStructure.lambdaFunctions.find(f => {
                // Normalize lambda path for comparison
                const lambdaPath = f.path.replace(/^\/|\/$/g, '');
                const lambdaMethod = f.method.toUpperCase();

                // Check if paths match (exactly or with minor differences) and if methods match
                return (normalizedPath === lambdaPath ||
                    normalizedPath.endsWith(lambdaPath) ||
                    lambdaPath.endsWith(normalizedPath)) &&
                    normalizedMethod === lambdaMethod;
            });
        };

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { path: string, method: string, error: any }[]
        };

        for (const [path, methods] of Object.entries(docData.paths)) {
            console.log(`Processing path: ${path}`);
            for (const [method, op] of Object.entries(methods)) {
                try {
                    console.log(`Processing method: ${method}`);
                    // build doc_text
                    let docText = `ENDPOINT_PATH: ${method.toUpperCase()} ${path}\n`;
                    if (op.summary) docText += `SUMMARY: ${op.summary}\n`;
                    if (op.description) docText += `DESCRIPTION: ${op.description}\n`;

                    let cron = findCron(path);
                    if (cron) {
                        docText += `\nCRON_JOB:\n`;
                        docText += `  Name: ${cron.name}\n`;
                        docText += `  Expression: ${cron.cronExpression}\n`;
                        docText += `  Brief: ${cron.brief}\n`;
                        docText += `  Packages: ${cron.packagesUsed.join(', ')}\n`;
                        docText += `  End Result: ${cron.endResult}\n`;
                    }

                    let fn = findLambda(path, method);
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
                    if (!fn && !cron) {
                        console.log(`No function or cron found for ${path} ${method}`);
                        continue;
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
                        .select('*')
                        .match({
                            ...(botProjectId ? { bot_project_id: botProjectId } : {}),
                            ...(originClientRequestId ? { origin_client_request_id: originClientRequestId } : {}),
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

                    // Determine function type with improved logic
                    const function_type = fn ? 'lambda' : cron ? 'cron' : "unknown";

                    // Create metadata with endpoint structure based on what's available
                    const metadata = {
                        openApiSchema: docData,
                        endpointSchema: op,
                        function_type: function_type,
                        // Include the endpoint structure regardless of type
                        ...(fn || cron ? { endpoint_structure: fn || cron || null } : {})
                    };

                    if (existing) {
                        // 2) Update existing
                        const { error: updateError } = await supabase
                            .from('api_embeddings')
                            .update({
                                doc_text: docText,
                                embedding,
                                metadata,
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
                                bot_project_id: botProjectId || null,
                                origin_client_request_id: originClientRequestId || null,
                                user_id: userId || null,
                                base_url: base_url,
                                endpoint_path: path,
                                http_method: method.toUpperCase(),
                                schema_path,
                                doc_text: docText,
                                embedding,
                                is_public: false,
                                stage: stage,
                                metadata,
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
