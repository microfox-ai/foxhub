import { Package } from "@/components/screens/Chat/message/types";
import { PackageStatus } from "@/server/types";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PACKAGE_INFO_TABLE = "package_infos";

export interface PackageDbInfo {
  id: string;
  package_name: string;
  package_title: string;
  package_path: string;
  platform_type: string;
  auth_type: string | null;
  auth_endpoint: string | null;
  webhook_endpoint: string | null;
  oauth2_scopes: string[] | null;
  description: string;
  dependencies: string[] | null;
  added_dependencies: string[] | null;
  status: string;
  documentation: string;
  icon: string;
  readme_map: any;
  constructors: any[];
  key_instructions: string | null;
  extra_info: any;
  raw_content: Package;
  file_path: string;
  github_url: string;
  updated_at: string;
}

async function searchPackages(searchTerm: string) {
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

  console.log(`\n✅ Found ${data.length} packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(`${index + 1}. ${pkg.package_name} - ${pkg.package_title}`);
  });
  return data.map((pkg: any) => pkg.raw_content);
}

async function getPackagesByPlatformType(platformType: string) {
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
}: {
  platformType?: string;
  status?: string;
  select?: string;
  statuses?: PackageStatus[];
}): Promise<Partial<PackageDbInfo>[]> {
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
  typedData.forEach((pkg, index) => {
    console.log(
      `${index + 1}. ${pkg.package_name} (${pkg.platform_type}/${pkg.status}) - ${pkg.auth_type || "none"}`
    );
  });

  return typedData;
}

export const PackageInfoHelper = {
  searchPackages,
  getPackageByName,
  getPackagesByPlatformType,
  getPackagesByStatus,
  getAllPackages,
  getPackageInfos,
  getPackageInfo,
};
