import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEPLOY_STAGE, FUNCTIONTYPE } from '@prisma/client';
import { embedApiEndpoints } from '@/utils/services/embeddings/embedFunctions';
import { OpenAPIDoc } from '@/utils/services/OpenAPIToolsClient';

// Simple schema validation
function validate(body: any) {
    const { base_url, stage, type } = body;
    if (!base_url || typeof base_url !== 'string') return 'Invalid or missing "base_url"';
    if (!Object.values(DEPLOY_STAGE).includes(stage)) return 'Invalid "stage"';
    if (!Object.values(FUNCTIONTYPE).includes(type)) return 'Invalid "type"';
    return null;
}

export async function GET(req: NextRequest) {
    const supabase = createClient(
        process.env.EMBEDDING_SUPABASE_URL!,
        process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!
    );
    const { searchParams } = new URL(req.url);
    const package_name = searchParams.get("package_name");
    const name = searchParams.get("name");

    if (package_name) {
        const { data, error } = await supabase
            .from('public_deployments')
            .select('*')
            .eq('package_name', package_name);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    }

    if (name) {
        const { data, error } = await supabase
            .from('public_deployments')
            .select('*')
            .eq('name', name);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    }

    const { data, error } = await supabase
        .from('public_deployments')
        .select('*');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("body", body);

        const err = validate(body);
        if (err) {
            console.log("err", err);
            return NextResponse.json({ error: err }, { status: 400 });
        }

        const supabase = createClient(
            process.env.EMBEDDING_SUPABASE_URL!,
            process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!
        );

        // Upsert on unique name
        const { data, error } = await supabase
            .from('public_deployments')
            .upsert(body, { onConflict: 'name' });

        if (error) {
            console.log("error", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await embedApiEndpoints({
            docData: body.metadata.docs_data as OpenAPIDoc,
            stage: body.stage,
            base_url: `${body.base_url}`,
            isPublic: true,
            schema_path: null,
          });
        return NextResponse.json({
            message: "Deployed successfully",
        }, { status: 200 });

    } catch (error) {
        console.error('Error in POST request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest) {
    const supabase = createClient(
        process.env.EMBEDDING_SUPABASE_URL!,
        process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!
    );
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const package_name = searchParams.get('package_name');
    if (!name && !package_name) {
        return NextResponse.json({ error: 'Missing "name" or "package_name" query parameter' }, { status: 400 });
    }
    if (name) {
        const { data, error } = await supabase
            .from('public_deployments')
            .delete()
            .eq('name', name);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (package_name) {
        const { data, error } = await supabase
            .from('public_deployments')
            .delete()
            .eq('package_name', package_name);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data || (data as any[])?.length === 0) {
            return NextResponse.json({ error: 'No record found to delete' }, { status: 404 });
        }
    }

    return NextResponse.json({ message: 'Deleted successfully' });
}
