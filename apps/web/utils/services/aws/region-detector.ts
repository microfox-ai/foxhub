import { headers } from "next/headers";

interface GeoInfo {
  ip: string;
  city: string;
  country: string;
  region: string;
  countryCode: string;
}

// Mapping of country codes to optimal AWS regions
const COUNTRY_TO_AWS_REGION: Record<string, string> = {
  // North America
  'US': 'us-east-1',
  'CA': 'ca-central-1',
  'MX': 'us-west-2',
  
  // Europe
  'GB': 'eu-west-2',
  'IE': 'eu-west-1',
  'DE': 'eu-central-1',
  'FR': 'eu-west-3',
  'IT': 'eu-south-1',
  'ES': 'eu-west-1',
  'NL': 'eu-west-1',
  'BE': 'eu-west-1',
  'SE': 'eu-north-1',
  'NO': 'eu-north-1',
  'DK': 'eu-north-1',
  'FI': 'eu-north-1',
  'PL': 'eu-central-1',
  'CZ': 'eu-central-1',
  'AT': 'eu-central-1',
  'CH': 'eu-central-1',
  
  // Asia Pacific
  'IN': 'ap-south-1',
  'JP': 'ap-northeast-1',
  'KR': 'ap-northeast-2',
  'CN': 'ap-northeast-1', // Closest available region
  'SG': 'ap-southeast-1',
  'MY': 'ap-southeast-1',
  'TH': 'ap-southeast-1',
  'ID': 'ap-southeast-1',
  'PH': 'ap-southeast-1',
  'VN': 'ap-southeast-1',
  'AU': 'ap-southeast-2',
  'NZ': 'ap-southeast-2',
  'HK': 'ap-northeast-1',
  'TW': 'ap-northeast-1',
  
  // South America
  'BR': 'sa-east-1',
  'AR': 'sa-east-1',
  'CL': 'sa-east-1',
  'CO': 'sa-east-1',
  'PE': 'sa-east-1',
  'VE': 'sa-east-1',
  'UY': 'sa-east-1',
  
  // Middle East
  'AE': 'me-south-1',
  'SA': 'me-south-1',
  'IL': 'me-south-1',
  'QA': 'me-south-1',
  'KW': 'me-south-1',
  'BH': 'me-south-1',
  'OM': 'me-south-1',
  'JO': 'me-south-1',
  'LB': 'me-south-1',
  
  // Africa
  'ZA': 'af-south-1',
  'EG': 'me-south-1',
  'NG': 'eu-west-1', // Closest available
  'KE': 'me-south-1',
  'MA': 'eu-west-1',
  'TN': 'eu-south-1',
  'GH': 'eu-west-1',
};

// Default fallback region
const DEFAULT_AWS_REGION = 'us-east-1';

/**
 * Gets the client IP address from request headers
 */
async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    
    // Try CloudFlare headers first
    const cfConnectingIp = headersList.get("cf-connecting-ip");
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    // Try other proxy headers
    const xForwardedFor = headersList.get("x-forwarded-for");
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const firstIp = xForwardedFor.split(',')[0];
      if (firstIp) {
        return firstIp.trim();
      }
    }
    
    const xRealIp = headersList.get("x-real-ip");
    if (xRealIp) {
      return xRealIp;
    }
    
    // Handle forwarded header
    const forwarded = headersList.get("forwarded");
    if (forwarded) {
      const forMatch = forwarded.match(/for=([^;,\s]+)/);
      if (forMatch?.[1]) {
        return forMatch[1]!.replace(/"/g, '');
      }
    }

    // Default to a public IP for testing if no real IP found
    return "8.8.8.8";
  } catch (error) {
    console.error("Error getting client IP:", error);
    return "8.8.8.8";
  }
}

/**
 * Gets geographic information using multiple IP geolocation services
 */
async function getGeoInfo(ip?: string): Promise<GeoInfo> {
  try {
    const targetIp = ip || await getClientIp();
    
    // First try CloudFlare headers if available
    const headersList = await headers();
    const cfCountry = headersList.get("cf-ipcountry");
    
    if (cfCountry && cfCountry !== "XX") {
      return {
        ip: targetIp,
        city: headersList.get("cf-ipcity") || "(not set)",
        country: cfCountry,
        region: headersList.get("cf-region") || "(not set)",
        countryCode: cfCountry,
      };
    }
    
    // Fallback to ipinfo.io
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://ipinfo.io/${targetIp}/json`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      ip: data.ip || targetIp,
      city: data.city || "(not set)",
      country: data.country || "US",
      region: data.region || "(not set)",
      countryCode: data.country || "US",
    };
  } catch (error) {
    console.error("Error getting geo information:", error);
    
    // Return default US location on error
    return {
      ip: ip || "8.8.8.8",
      city: "(not set)",
      country: "US",
      region: "(not set)",
      countryCode: "US",
    };
  }
}

/**
 * Determines the best AWS region based on request metadata
 */
export async function detectOptimalAwsRegion(): Promise<{
  region: string;
  geoInfo: GeoInfo;
  reasoning: string;
}> {
  try {
    const geoInfo = await getGeoInfo();
    
    // Get the optimal AWS region for the country
    const optimalRegion = COUNTRY_TO_AWS_REGION[geoInfo.countryCode] || DEFAULT_AWS_REGION;
    
    let reasoning = `Detected country: ${geoInfo.country} (${geoInfo.countryCode})`;
    
    if (geoInfo.city !== "(not set)") {
      reasoning += `, City: ${geoInfo.city}`;
    }
    
    if (optimalRegion === DEFAULT_AWS_REGION && !COUNTRY_TO_AWS_REGION[geoInfo.countryCode]) {
      reasoning += `. Using default region ${DEFAULT_AWS_REGION} (no specific mapping found)`;
    } else {
      reasoning += `. Optimal AWS region: ${optimalRegion}`;
    }
    
    return {
      region: optimalRegion,
      geoInfo,
      reasoning,
    };
  } catch (error) {
    console.error("Error detecting optimal AWS region:", error);
    
    return {
      region: DEFAULT_AWS_REGION,
      geoInfo: {
        ip: "unknown",
        city: "(error)",
        country: "Unknown",
        region: "(error)",
        countryCode: "US",
      },
      reasoning: `Error detecting location, using default region: ${DEFAULT_AWS_REGION}`,
    };
  }
}

/**
 * Gets all available AWS regions with their descriptions
 */
export function getAvailableAwsRegions(): Record<string, string> {
  return {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'ca-central-1': 'Canada (Central)',
    'eu-central-1': 'Europe (Frankfurt)',
    'eu-west-1': 'Europe (Ireland)',
    'eu-west-2': 'Europe (London)',
    'eu-west-3': 'Europe (Paris)',
    'eu-north-1': 'Europe (Stockholm)',
    'eu-south-1': 'Europe (Milan)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'sa-east-1': 'South America (São Paulo)',
    'me-south-1': 'Middle East (Bahrain)',
    'af-south-1': 'Africa (Cape Town)',
  };
} 