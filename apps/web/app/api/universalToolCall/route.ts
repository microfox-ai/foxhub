import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/prisma/prisma';

// Ensure you have a 32-byte base64-encoded key in your .env, e.g.: ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
}
const KEY = Buffer.from(ENCRYPTION_KEY, 'base64'); // 32 bytes

/**
 * GET /api/universalToolCall
 * Query params:
 *   publicApiUrl: string (destination URL)
 *   clientSecretIds: comma-separated list of secret IDs
 *
 * Responds with a 307 redirect to publicApiUrl,
 * attaching an encrypted header 'client-env-variables'.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const publicApiUrl = url.searchParams.get('publicApiUrl');
    const clientSecretIds = url.searchParams.get('clientSecretIds');

    if (!publicApiUrl || !clientSecretIds) {
        return NextResponse.json(
            { error: 'Missing publicApiUrl or clientSecretIds parameters.' },
            { status: 400 }
        );
    }

    // Fetch secrets from database
    const secrets = await Promise.all(
        clientSecretIds.split(',').map(async (id) => {
            const record = await prisma.clientSecret.findUnique({ where: { id } });
            return record?.variables || {};
        })
    );

    // Consolidate and stringify
    const payload = JSON.stringify(secrets);

    // Encryption: AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + ciphertext
    const encryptedBundle = Buffer.concat([iv, authTag, encrypted]).toString('base64');

    // Issue a 307 redirect with the encrypted header
    const response = NextResponse.redirect(publicApiUrl, 307);
    response.headers.set('client-env-variables', encryptedBundle);

    return response;
}