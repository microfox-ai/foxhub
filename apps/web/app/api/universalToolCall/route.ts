import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/prisma/prisma';

export async function middleware(request: NextRequest) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
  }
  const KEY = Buffer.from(ENCRYPTION_KEY, 'base64'); // 32 bytes

  const url = new URL(request.url);
  const publicApiUrl = url.searchParams.get('publicApiUrl');
  const clientSecretIds = url.searchParams.get('clientSecretIds');

  if (!publicApiUrl || !clientSecretIds) {
    return NextResponse.json(
      { error: 'Missing publicApiUrl or clientSecretIds parameters.' },
      { status: 400 }
    );
  }

  // Fetch and flatten secrets
  const secretArrays = await Promise.all(
    clientSecretIds.split(',').map(async (id) => {
      const record = await prisma.clientSecret.findUnique({ where: { id } });
      return (record?.variables || []) as Record<"key" | "value", string>[];
    })
  );

  // Flatten into a single object: { key1: value1, key2: value2, ... }
  const flatEnv: Record<string, string> = {};
  for (const arr of secretArrays) {
    for (const entry of arr) {
      flatEnv[entry.key] = entry.value;
    }
  }

  const payload = JSON.stringify(flatEnv);
  console.log("payload", payload);

  // Encrypt using AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const bundle = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  
  // Make the Base64 URL-safe by replacing + with - and / with _
  const urlSafeBundle = bundle.replace(/\+/g, '-').replace(/\//g, '_');
  // Remove padding = characters
  const trimmedBundle = urlSafeBundle.replace(/=+$/, '');

  // Create URL with the bundle as a search parameter
  const targetUrl = new URL(publicApiUrl);
  targetUrl.searchParams.set('client-env-variables', trimmedBundle);
  
  return NextResponse.redirect(targetUrl.toString(), 307);
}

// Allow all methods to use this logic
export { middleware as GET, middleware as POST, middleware as PUT, middleware as DELETE, middleware as PATCH };
