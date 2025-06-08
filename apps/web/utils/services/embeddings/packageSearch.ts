import { PackageStatus } from "@/server/types";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EMBEDDING_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EMBEDDING_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PACKAGE_INFO_TABLE = "package_infos";

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

async function getPackageInfos(packageNames: string[]) {
  const { data, error } = await supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      "package_name, package_title, description, platform_type, status, auth_type, documentation, icon, updated_at"
    )
    .in("package_name", packageNames);

  if (error) {
    console.error("❌ Error getting package infos:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("ℹ️  No packages found");
    return;
  }

  console.log(`\n✅ Found ${data.length} packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(`${index + 1}. ${pkg.package_name} - ${pkg.description}`);
  });
  return data;
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
}): Promise<any[]> {
  console.log(`🔍 Getting all packages...`);

  const query = supabase
    .from(PACKAGE_INFO_TABLE)
    .select(
      select
        ? `package_name, package_title, platform_type, status, auth_type, updated_at ${select}`
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

  console.log(`\n✅ Found ${data.length} total packages:`);
  data.forEach((pkg: any, index: number) => {
    console.log(
      `${index + 1}. ${pkg.package_name} (${pkg.platform_type}/${pkg.status}) - ${pkg.auth_type || "none"}`
    );
  });

  return data;
}

export const PackageInfoHelper = {
  searchPackages,
  getPackageByName,
  getPackagesByPlatformType,
  getPackagesByStatus,
  getAllPackages,
  getPackageInfos,
};
