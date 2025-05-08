export async function fetchGithubJson(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format with proper encoding
  const encodedPath = encodeURIComponent(path);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${encodedPath}`;

  console.log("fetching", url);
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

export async function fetchGithubText(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format with proper encoding
  const encodedPath = encodeURIComponent(path);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${encodedPath}`;

  console.log("fetching", url);
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub JSON:", error);
    throw error;
  }
}

export async function fetchText(url: string) {
  try {
    console.log("fetching", url);
    const encodedPath = encodeURIComponent(url);
    const response = await fetch(encodedPath);
    const data = await response.text();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub JSON:", error);
    throw error;
  }
}

export async function fetchJson(url: string) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub JSON:", error);
    throw error;
  }
}

export async function fetchPackageInfo(packageName: string) {
  try {
    if (packageName === "@microfox/null") {
      return null;
    }
    const path = packageName.startsWith("@microfox/")
      ? packageName.replaceAll("@microfox/", "packages/")
      : `packages/@ext_${packageName.replaceAll("/", "#")}`;

    console.log("fetching", `/refs/heads/main/${path}/package-info.json`);
    const packageInfo = await fetchGithubJson(
      "microfox-ai",
      "microfox",
      `/refs/heads/main/${path}/package-info.json`
    );
    return packageInfo;
  } catch (error) {
    console.error("Error fetching package info:", error);
    return null;
  }
}

export async function fetchPackageReadme(packageName: string) {
  try {
    const path = packageName.startsWith("@microfox/")
      ? packageName.replaceAll("@microfox/", "packages/")
      : `packages/@ext_${packageName.replaceAll("/", "#")}`;
    const readme = await fetchGithubText(
      "microfox-ai",
      "microfox",
      `/refs/heads/main/${path}/README.md`
    );
    return readme;
  } catch (error) {
    console.error("Error fetching package readme:", error);
    return null;
  }
}

export function packagePathFromName(packageName: string) {
  return packageName.startsWith("@microfox/")
    ? packageName.replaceAll("@microfox/", "packages/")
    : `packages/@ext_${packageName.replaceAll("/", "#")}`;
}

export function packageNameFromPath(packagePath: string) {
  return packagePath.startsWith("packages/")
    ? packagePath.replaceAll("packages/", "@microfox/")
    : packagePath.replaceAll("packages/@ext_", "@ext_");
}
