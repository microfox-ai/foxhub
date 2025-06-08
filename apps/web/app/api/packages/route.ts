import { Constructor, Package } from "@/components/screens/Chat/message/types";
import { PackageStatus } from "@/server/types";
import { prisma } from "@/prisma/prisma";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { NextResponse } from "next/server";

// Base URL for package data
const PACKAGE_BASE_URL =
  "https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main";

// Interface for package.json
interface PackageJson {
  name: string;
  version: string;
  description?: string;
}

// Interface for formatted package data
interface FormattedPackageData {
  name: string;
  status: string;
  version: string;
  description: string;
  installs: string;
  inUse: string;
  icon: string;
}

// Helper function to fetch data with potential caching
// Reduces load on external APIs (GitHub in this case)
async function fetchWithCache(url: string, options: RequestInit = {}) {
  // Default cache options - can be extended in the future
  const defaultOptions: RequestInit = {
    next: {
      // Default to no caching, but can be overridden
      revalidate: 0,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to get status display text
function getStatusDisplay(status: string): string {
  switch (status.toLowerCase()) {
    case "stable":
      return "STABLE";
    case "partial":
      return "BETA";
    case "alpha":
      return "ALPHA";
    case "deprecated":
      return "DEPRECATED";
    default:
      return status.toUpperCase() || "UNKNOWN";
  }
}

// Helper function to find the first constructor with oauth2 or apiKey auth
function findAuthConstructor(constructors?: Constructor[]): string {
  if (!constructors || constructors?.length === 0) {
    return "-";
  }

  const authConstructor = constructors?.find(
    (constructor) =>
      constructor.auth === "oauth2" || constructor.auth === "apikey"
  );

  return authConstructor ? authConstructor.name : "-";
}

// Helper function to fetch client secrets count
async function getClientSecretsCount(
  packageName: string,
  constructorName: string
): Promise<string> {
  if (constructorName === "-") {
    return "-";
  }

  try {
    const secretType = `${packageName}/${constructorName}`;
    const count = await prisma.clientSecret.count({
      where: {
        type: secretType,
      },
    });

    return count > 0 ? count.toString() : "-";
  } catch (error) {
    console.error(
      `Error fetching client secrets for ${packageName}/${constructorName}:`,
      error
    );
    return "-";
  }
}

export async function GET(request: Request) {
  try {
    // Get cache duration from query params (in seconds)
    const url = new URL(request.url);
    const cacheDuration = url.searchParams.get("cache");

    // Set cache options based on query param
    const cacheOptions: RequestInit = {
      next: {
        revalidate: cacheDuration ? parseInt(cacheDuration) : 0,
      },
    };

    // Fetch packages list
    const packagesList = (await fetchWithCache(
      `${PACKAGE_BASE_URL}/packages-list.json`,
      cacheOptions
    )) as any;

    const packages = await PackageInfoHelper.getAllPackages({
      statuses: [
        PackageStatus.STABLE,
        PackageStatus.SEMISTABLE,
        PackageStatus.EXTERNAL,
      ],
    });

    const packageNames = packages?.map((pkg: any) => pkg.package_name);

    // Return the formatted data
    return NextResponse.json(
      { packages },
      {
        status: 200,
        headers: {
          // Add cache control headers if cache duration is specified
          ...(cacheDuration && {
            "Cache-Control": `public, max-age=${cacheDuration}`,
          }),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching package data:", error);
    return NextResponse.json(
      { error: "Failed to fetch package data" },
      { status: 500 }
    );
  }
}
