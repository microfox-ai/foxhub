export async function fetchGithubJson(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${path}`;

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

export async function fetchPackageInfo(packageName: string) {
  try {
    const packageInfo = await fetchGithubJson(
      "microfox-ai",
      "microfox",
      `/refs/heads/main/packages/${packageName.replaceAll("@microfox/", "")}/package-info.json`
    );
    return packageInfo;
  } catch (error) {
    console.error("Error fetching package info:", error);
    return null;
  }
}

export async function fetchPackageReadme(packageName: string) {
  try {
    const readme = await fetchGithubJson(
      "microfox-ai",
      "microfox",
      `/refs/heads/main/packages/${packageName.replaceAll("@microfox/", "")}/README.md`
    );
    return readme;
  } catch (error) {
    console.error("Error fetching package readme:", error);
    return null;
  }
}
