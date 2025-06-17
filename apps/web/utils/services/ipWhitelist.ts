import { NextRequest } from "next/server";

// Helper function to get client IP
export function getClientIP(req: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');

    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, get the first one
        const firstIP = forwarded.split(',')[0]?.trim();
        if (firstIP) {
            return firstIP;
        }
    }

    if (realIP) {
        return realIP;
    }

    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // Fallback for unknown IP
    return 'unknown';
}

// Helper function to check if IP is whitelisted
export function isIPWhitelisted(clientIP: string): boolean {
    const whitelistedIPs = process.env.WHITELISTED_IPS;

    if (!whitelistedIPs) {
        console.warn('WHITELISTED_IPS environment variable not set');
        return false;
    }

    // Split by comma and trim whitespace
    const ipList = whitelistedIPs.split(',').map(ip => ip.trim());

    // Check if client IP is in the whitelist
    return ipList.includes(clientIP);
}