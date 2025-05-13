import { createClient } from '@supabase/supabase-js';
import { embed } from './geminiEmbed';
import { OpenAPIDoc } from '@/utils/services/OpenAPIToolsClient'
import { TaskStructure } from '@/server/convertfox/types'

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
    // helper to find cron job for an endpoint path
    const findCron = (path: string) =>
        taskStructure.cronJobs.find(c => path.endsWith(c.name) || path.includes(c.name));

    // helper to find lambda function metadata
    const findLambda = (path: string) =>
        taskStructure.lambdaFunctions.find(f => f.path === path);

    for (const [path, methods] of Object.entries(docData.paths)) {
        for (const [method, op] of Object.entries(methods)) {
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
            const embedding = await embed(docText);
            const { error } = await supabase
                .from('api_embeddings')
                .upsert({
                    botProjectId: botProjectId,
                    originClientRequestId: originClientRequestId,
                    userId: userId,
                    base_url: docData.servers?.[0]?.url || null,
                    schema_path: '/openapi.json',
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
                }, { onConflict: 'botProjectId,endpoint_path,http_method' });

            if (error) {
                console.error(`Failed to upsert ${method.toUpperCase()} ${path}:`, error);
            } else {
                console.log(`Upserted embedding for ${method.toUpperCase()} ${path}`);
            }
        }
    }
}