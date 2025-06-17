import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
    try {

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        // Your identity verification secret
        const secretKey = process.env.FEATUREBASE_IDENTITY_KEY;

        if (!secretKey || !email) {
            return NextResponse.json(
                { error: 'Identity key or email not configured' },
                { status: 500 }
            );
        }

        // Use email as user identifier
        const userIdentifier = email;

        // Generate HMAC hash
        const userHash = crypto
            .createHmac('sha256', secretKey)
            .update(userIdentifier)
            .digest('hex');

        return NextResponse.json({ userHash });
    } catch (error) {
        console.error('Error generating identity hash:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
