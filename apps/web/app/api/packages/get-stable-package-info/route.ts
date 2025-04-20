import { NextResponse } from "next/server";

const PACKAGE_BASE_URL =
  "https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main";

export async function GET() {
  try {
    // Fetch the packages list
    const packagesListResponse = await fetch(
      `${PACKAGE_BASE_URL}/packages-list.json`
    );
    const packagesList = await packagesListResponse.json();

    // Get stable packages paths
    const stablePackages = packagesList.stablePackages;

    // Fetch package info for each stable package
    const packageInfos = await Promise.all(
      stablePackages.map(async (packagePath: string) => {
        try {
          const response = await fetch(
            `${PACKAGE_BASE_URL}/${packagePath}/package-info.json`
          );
          if (!response.ok) {
            console.error(`Failed to fetch package info for ${packagePath}`);
            return null;
          }
          const packageInfo = await response.json();
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
