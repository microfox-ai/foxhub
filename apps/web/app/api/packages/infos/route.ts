import { fetchGithubJson } from "@/server/convertfox/gitFetchers";
import { PackageStatus } from "@/server/types";
import { NextResponse } from "next/server";

const PACKAGE_BASE_URL =
  "https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const packageTypes = url.searchParams.get("packageTypes");
    const packageTypesArray = packageTypes ? packageTypes.split(",") : [];
    // Fetch the packages list
    const packagesListResponse = await fetch(
      `${PACKAGE_BASE_URL}/packages-list.json`
    );
    const packagesList = await packagesListResponse.json();

    let allList: string[] = [];
    packageTypesArray.forEach((packageType) => {
      if (packageType === PackageStatus.STABLE) {
        allList = allList.concat(packagesList.stablePackages);
      } else if (packageType === PackageStatus.SEMISTABLE) {
        allList = allList.concat(packagesList.semiStablePackages);
      } else if (packageType === PackageStatus.PARTIAL) {
        allList = allList.concat(packagesList.partialPackages);
      }
    });

    // Fetch package info for each stable package
    const packageInfos = await Promise.all(
      allList.map(async (packagePath: string) => {
        try {
          const packageInfo = await fetchGithubJson(
            "microfox-ai",
            "microfox",
            `/refs/heads/main/${packagePath}/package-info.json`
          );
          return packageInfo;
        } catch (error) {
          console.error(
            `Error fetching package info for ${packagePath}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out any failed fetches
    const validPackageInfos = packageInfos.filter(
      (info) => info !== null && info !== undefined
    );

    return NextResponse.json(validPackageInfos);
  } catch (error) {
    console.error("Error fetching stable packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stable packages" },
      { status: 500 }
    );
  }
}
