import { PackageStatus } from "@/server/types";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { NextResponse } from "next/server";

const PACKAGE_BASE_URL =
  "https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const packageTypes = url.searchParams.get("packageTypes");
    const packageTypesArray = packageTypes ? packageTypes.split(",") : [];
    const packageNames = url.searchParams.get("packageNames");
    const packageNamesArray = packageNames ? packageNames.split(",") : [];

    const validPackageInfos = await PackageInfoHelper.getAllPackages({
      ...(packageTypesArray.length > 0 && {
        statuses: packageTypesArray.map((type) => type as PackageStatus),
      }),
      ...(packageNamesArray.length > 0 && { packageNames: packageNamesArray }),
      select: "*",
    });

    console.log(packageNamesArray);

    return NextResponse.json(validPackageInfos.map((pkg) => pkg.raw_content));
  } catch (error) {
    console.error("Error fetching stable packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stable packages" },
      { status: 500 }
    );
  }
}
