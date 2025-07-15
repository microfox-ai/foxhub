import { PackageStatus } from "@/server/types";
import {
  getApiMcpsByPackageName,
  PackageInfoHelper,
} from "@/utils/services/embeddings/packageSearch";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const agentNames = url.searchParams.get("agentNames");
    const agentNamesArray = agentNames ? agentNames.split(",") : [];

    const validPackageInfos = await getApiMcpsByPackageName(agentNamesArray);
    const openApiSchemas = validPackageInfos.map(
      (pkg) => pkg.metadata?.docs_data
    );
    const agentInfos = openApiSchemas.map((schema) => schema.info);

    return NextResponse.json(agentInfos);
  } catch (error) {
    console.error("Error fetching stable packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stable packages" },
      { status: 500 }
    );
  }
}
