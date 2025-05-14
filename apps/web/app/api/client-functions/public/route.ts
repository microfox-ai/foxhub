import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEPLOY_STAGE, FUNCTIONTYPE } from '@prisma/client';

const supabase = createClient(
    process.env.EMBEDDING_SUPABASE_URL!,
    process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!
);

// Simple schema validation
function validate(body: any) {
    const { name, base_url, stage, type } = body;
    if (!name || typeof name !== 'string') return 'Invalid or missing "name"';
    if (!base_url || typeof base_url !== 'string') return 'Invalid or missing "base_url"';
    if (!Object.values(DEPLOY_STAGE).includes(stage)) return 'Invalid "stage"';
    if (!Object.values(FUNCTIONTYPE).includes(type)) return 'Invalid "type"';
    return null;
}

export async function GET(req: NextRequest) {
    const { data, error } = await supabase
        .from('public_deployments')
        .select('*');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const err = validate(body);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    // Upsert on unique name
    const { data, error } = await supabase
        .from('public_deployments')
        .upsert(body, { onConflict: 'name' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 200 });
}