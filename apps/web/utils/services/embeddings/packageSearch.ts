import { PackageStatus } from "@/server/types";
import { createClient } from "@supabase/supabase-js";
import { embed } from "./geminiEmbed";
import { getLocalMcpDocs } from "@/server/toolfox/execution/loadLocalTools";
import { RagUpstashSdk } from "@microfox/rag-upstash";
import { FilterHelpers } from "@microfox/rag-upstash";
import { ApiMcp, PackageDbInfo, QueryApisResult } from "./types";
import { Package } from "@/components/screens/Chat/message/types";

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

const PACKAGE_INFO_TABLE = "package_infos";

const MATCH_THRESHOLD = 0.78;
const MATCH_COUNT = 10;
const TABLE_NAME = "package_infos";
const MATCH_PACKAGE_RPC = "match_package_infos";
const MATCH_MCP_RPC = "match_mcps";

async function searchPackages(searchTerm: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🔍 Searching for packages containing: "${searchTerm}"`);

  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      "id, package_name, package_title, description, platform_type, status, auth_type, documentation, icon, updated_at"
    )
    .or(
      `package_name.ilike.%${searchTerm}%, package_title.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`
    )
    .order("package_name");

  if (error) {
    console.error("❌ Error searching packages:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found");
    return;
  }

  console.log(`\n✅ Found ${data.length} packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(`\n${index + 1}. ${pkg.package_name}`);
    console.log(`   Title: ${pkg.package_title}`);
    console.log(`   Type: ${pkg.platform_type}`);
    console.log(`   Status: ${pkg.status}`);
    console.log(`   Auth: ${pkg.auth_type || "none"}`);
    console.log(`   Description: ${pkg.description}`);
    console.log(`   Updated: ${new Date(pkg.updated_at).toLocaleDateString()}`);
  });
}

async function getPackageByName(packageName: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🔍 Getting package details for: "${packageName}"`);

  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select("*")
    .eq("package_name", packageName)
    .single();

  if (error) {
    console.error("❌ Error getting package:", error);
    return;
  }

  if (!data) {
    console.log("ℹ️  Package not found");
    return;
  }

  console.log(`\n✅ Package Details:`);
  console.log(`   Name: ${data.package_name}`);
  console.log(`   Title: ${data.package_title}`);
  console.log(`   Path: ${data.package_path}`);
  console.log(`   Type: ${data.platform_type}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Auth: ${data.auth_type || "none"}`);
  console.log(`   Description: ${data.description}`);
  console.log(`   Documentation: ${data.documentation}`);
  console.log(
    `   Dependencies: ${Array.isArray(data.dependencies) ? data.dependencies.join(", ") : "none"}`
  );
  console.log(
    `   Constructors: ${Array.isArray(data.constructors) ? data.constructors.map((c: any) => c.name).join(", ") : "none"}`
  );
  console.log(`   Updated: ${new Date(data.updated_at).toLocaleDateString()}`);
}

async function getPackageInfos(packageNames: string[]): Promise<Package[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select("package_name, package_title, raw_content, updated_at")
    .in("package_name", packageNames);

  if (error) {
    console.error("❌ Error getting package infos:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found");
    return [];
  }

  // console.log(`\n✅ Found ${data.length} packages:`);
  // data.forEach((pkg: any, index: number) => {
  //   console.log(`${index + 1}. ${pkg.package_name} - ${pkg.package_title}`);
  // });
  return data.map((pkg: any) => pkg.raw_content);
}

async function getPackagesByPlatformType(platformType: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🔍 Getting packages by platform type: "${platformType}"`);

  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      "id, package_name, package_title, description, status, auth_type, documentation, icon, updated_at"
    )
    .eq("platform_type", platformType)
    .order("package_name");

  if (error) {
    console.error("❌ Error getting packages by platform type:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found for this platform type");
    return;
  }

  console.log(`\n✅ Found ${data.length} ${platformType} packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(`${index + 1}. ${pkg.package_name} - ${pkg.description}`);
  });
}

async function getPackagesByStatus(status: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🔍 Getting packages by status: "${status}"`);

  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      "id, package_name, package_title, description, platform_type, auth_type, documentation, icon, updated_at"
    )
    .eq("status", status)
    .order("package_name");

  if (error) {
    console.error("❌ Error getting packages by status:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found for this status");
    return;
  }

  console.log(`\n✅ Found ${data.length} ${status} packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(
      `${index + 1}. ${pkg.package_name} (${pkg.platform_type}) - ${pkg.description}`
    );
  });
}

/**
 *
 * @param package_name @microfox/... or ...
 */
async function getPackageInfo(
  package_name: string
): Promise<Partial<Package> | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  if (package_name === "@microfox/null") {
    return null;
  }

  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select("*")
    .eq("package_name", package_name)
    .single();

  if (error) {
    console.error("❌ Error getting package info:", error);
    throw error;
  }

  return data.raw_content;
}

async function getAllPackages({
  platformType,
  status,
  select,
  statuses,
  packageNames,
}: {
  platformType?: string;
  status?: string;
  select?: string;
  statuses?: PackageStatus[];
  packageNames?: string[];
}): Promise<Partial<PackageDbInfo>[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log(`🔍 Getting all packages...`);

  const query = supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      select === "*"
        ? "*"
        : select
          ? `package_name, package_title, platform_type, status, auth_type, updated_at, ${select}`
          : "package_name, package_title, platform_type, status, auth_type, updated_at"
    );

  if (platformType) {
    query.eq("platform_type", platformType);
  }

  if (status) {
    query.eq("status", status);
  }

  if (statuses) {
    query.in("status", statuses);
  }

  if (packageNames) {
    query.in("package_name", packageNames);
  }

  const { data, error } = await query.order("package_name");

  if (error) {
    console.error("❌ Error getting all packages:", error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found");
    return [];
  }

  const typedData = data as Partial<PackageDbInfo>[];

  console.log(`\n✅ Found ${typedData.length} total packages:`);
  // typedData.forEach((pkg, index) => {
  //   console.log(
  //     `${index + 1}. ${pkg.package_name} (${pkg.platform_type}/${pkg.status}) - ${pkg.auth_type || "none"}`
  //   );
  // });

  return typedData;
}

export async function findSimilarPackages(
  query: string,
  match_threshold: number = MATCH_THRESHOLD,
  match_count: number = MATCH_COUNT
) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const embedding = await embed(query);

    const { data: packages, error } = await supabase.rpc(MATCH_PACKAGE_RPC, {
      query_embedding: embedding,
      match_threshold: match_threshold,
      match_count: match_count,
    });

    if (error) {
      console.error("Error querying Supabase:", error);
      throw new Error(`Error finding similar packages: ${error.message}`);
    }

    if (!packages || packages.length === 0) {
      console.log("No similar packages found.");
      return [];
    }

    const packagesWithFunctionalities = packages.map((pkg: any) => {
      const functionalities =
        pkg.constructors?.flatMap((c: any) => c.functionalities || []) || [];
      return {
        ...pkg,
        functionalities,
      };
    });

    return packagesWithFunctionalities;
  } catch (err) {
    console.error("An unexpected error occurred:", err);
    throw err;
  }
}

export async function plainSearchMcps({
  query,
  match_count = 10,
  api_type,
}: {
  query: string;
  match_count?: number;
  api_type?: string;
}): Promise<ApiMcp[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    let queryBuilder = supabase
      .from("api_mcps")
      .select("*")
      .like("package_name", `%${query}%`)
      .limit(match_count);

    if (api_type) {
      queryBuilder = queryBuilder.eq("api_type", api_type);
    }

    let { data: packages, error } = await queryBuilder;

    const localMcps = await getLocalMcpDocs();
    if (localMcps.length > 0) {
      packages = [...(packages as ApiMcp[]), ...localMcps] as ApiMcp[];
    }

    if (error) {
      console.error("Error querying Supabase:", error);
      throw new Error(`Error finding similar packages: ${error.message}`);
    }

    if (!packages || packages.length === 0) {
      console.log("No similar packages found.");
      return [];
    }

    return packages;
  } catch (err) {
    console.error("An unexpected error occurred:", err);
    throw err;
  }
}

export async function getApiMcpsByPackageName(
  packageNames: string[]
): Promise<ApiMcp[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from("api_mcps")
    .select("*")
    .in("package_name", packageNames);
  if (error) {
    console.error("Error querying Supabase:", error);
    throw new Error(`Error finding similar packages: ${error.message}`);
  }
  if (!data || data.length === 0) {
    console.log("No similar packages found.");
    return [];
  }
  return data;
}

export async function getApiMcpById(ids: number[]): Promise<ApiMcp[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let { data, error } = await supabase
    .from("api_mcps")
    .select("*")
    .in("id", ids);

  const localMcps = await getLocalMcpDocs();
  if (localMcps.length > 0) {
    data = [...(data as ApiMcp[]), ...localMcps];
  }
  if (error) {
    console.error("Error querying Supabase:", error);
    throw new Error(`Error finding similar packages: ${error.message}`);
  }
  if (!data || data.length === 0) {
    console.log("No similar packages found.");
    return [];
  }
  return data;
}

export async function findApiMcps({
  query,
  match_threshold = MATCH_THRESHOLD,
  match_count = MATCH_COUNT,
  api_type,
}: {
  query: string;
  match_threshold?: number;
  match_count?: number;
  api_type?: string;
}): Promise<ApiMcp[]> {
  try {
    const ragClient = new RagUpstashSdk({
      upstashUrl: process.env.MICROFOX_UPSTASH_VECTOR_REST_URL ?? "",
      upstashToken: process.env.MICROFOX_UPSTASH_VECTOR_REST_TOKEN ?? "",
    });
    console.log("Searching MCPs with query:", query);

    // Build filter for Upstash RAG
    const filterBuilder = FilterHelpers;
    let filter: any = filterBuilder.and(filterBuilder.eq("type", "api_mcp"));

    if (api_type) {
      filter = filterBuilder.and(
        filter,
        filterBuilder.eq("api_type", api_type)
      );
    }

    const results: ApiMcp[] = [];

    // Search in global MCP namespace
    const mcpNamespace = "api-mcps";
    console.log(`Searching MCPs in namespace: ${mcpNamespace}`);

    const mcpResults = await ragClient.queryDocsFromRAG(
      {
        data: query,
        topK: match_count,
        filter: filter,
        includeData: false,
        includeMetadata: true,
      },
      mcpNamespace
    );

    // Fetch full data from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    for (const ragResult of mcpResults) {
      if (ragResult.metadata?.supabase_id) {
        const { data: supabaseData, error } = await supabase
          .from("api_mcps")
          .select("*")
          .eq("id", ragResult.metadata.supabase_id)
          .single();

        if (!error && supabaseData) {
          const similarity =
            (ragResult as any).score || (ragResult as any).similarity || 0;

          // Apply similarity threshold
          if (similarity >= match_threshold) {
            results.push({
              id: supabaseData.id,
              name: supabaseData.name,
              package_name: supabaseData.package_name,
              base_url: supabaseData.base_url,
              stage: supabaseData.stage,
              api_type: supabaseData.api_type,
              type: supabaseData.type,
              similarity: similarity,
              created_at: supabaseData.created_at,
              updated_at: supabaseData.updated_at,
              openApiSchema: supabaseData.metadata?.docs_data,
              metadata: supabaseData.metadata,
            });
          }
        }
      }
    }

    // Add local MCPs if available
    const localMcps = await getLocalMcpDocs();
    if (localMcps.length > 0) {
      results.push(...localMcps);
    }

    if (results.length === 0) {
      console.log("No similar MCPs found.");
      return [];
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error("An unexpected error occurred:", err);
    throw err;
  }
}

export const PackageInfoHelper = {
  searchPackages,
  getPackageByName,
  getPackagesByPlatformType,
  getPackagesByStatus,
  getAllPackages,
  getPackageInfos,
  getPackageInfo,
  findSimilarPackages,
  findApiMcps,
  plainSearchMcps,
};
