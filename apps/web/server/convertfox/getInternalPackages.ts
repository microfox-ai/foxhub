async function fetchGithubJson(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${path}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub JSON:", error);
    throw error;
  }
}

/**
 * Get the internal packages from the microfox-ai repository
 * @returns {Promise<any>} The internal packages
 */
export async function getPackageList(): Promise<{
  stablePackages: string[];
  partialPackages: string[];
  semiStablePackages: string[];
  deprecatedPackages?: string[];
}> {
  const packages = await fetchGithubJson(
    "microfox-ai",
    "microfox",
    "/refs/heads/main/packages-list.json"
  );
  return {
    stablePackages: packages.stablePackages.map((pkg: string) =>
      pkg.replaceAll("packages/", "@microfox/")
    ),
    partialPackages: packages.partialPackages.map((pkg: string) =>
      pkg.replaceAll("packages/", "@microfox/")
    ),
    semiStablePackages: packages.semiStablePackages.map((pkg: string) =>
      pkg.replaceAll("packages/@ext_", "").replaceAll("#", "/")
    ),
    // deprecatedPackages: packages.deprecatedPackages.map((pkg: string) =>
    //   pkg.replaceAll("packages/", "@microfox/")
    // ),
  };
}
export async function getOnlyPackageNames(packages: any[]) {
  return packages.map((pkg: any) => pkg.name);
}
