const GITHUB_API_URL = "https://api.github.com";

interface GithubSdkConfig {
  owner: string;
  repo: string;
  token: string;
}

interface PRParams {
  title: string;
  head: string;
  base: string;
  body?: string;
}

interface BranchParams {
  branchName: string;
  baseBranch: string;
}

interface RepoParams {
  newRepoName: string;
  newOwner?: string;
  includeAllBranches?: boolean;
  privateRepo?: boolean;
  description?: string;
}

interface UpdateFileParams {
  path: string;
  content: string;
  commitMessage: string;
  branch: string;
}

export class GithubSdk {
  private owner: string;
  private repo: string;
  private token: string;

  constructor(config: GithubSdkConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
  }

  private async githubApiRequest<T>(
    endpoint: string,
    method: string = "GET",
    body: any = null
  ): Promise<T> {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`GitHub API Error: ${errorMessage}`);
    }

    return await response.json();
  }

  // -------------------------
  // Repository Management
  // -------------------------

  public async createRepositoryFromTemplate(params: RepoParams) {
    const endpoint = `/repos/${this.owner}/${this.repo}/generate`;
    const payload = {
      owner: params.newOwner || this.owner,
      name: params.newRepoName,
      include_all_branches: params.includeAllBranches || false,
      private: params.privateRepo || true,
      description: params.description || "",
    };

    return await this.githubApiRequest(endpoint, "POST", payload);
  }

  public async getRepoDetails() {
    return await this.githubApiRequest(`/repos/${this.owner}/${this.repo}`);
  }

  // -------------------------
  // Pull Requests Management
  // -------------------------

  public async createPullRequest(params: PRParams) {
    const endpoint = `/repos/${this.owner}/${this.repo}/pulls`;
    return await this.githubApiRequest(endpoint, "POST", params);
  }

  public async createCommentOnPr(prNumber: number, comment: string) {
    const endpoint = `/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`;
    const payload = { body: comment };
    return await this.githubApiRequest(endpoint, "POST", payload);
  }

  public async getAllPullRequests() {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/pulls`
    );
  }

  public async getPrDetails(prNumber: number): Promise<any> {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`
    );
  }

  // -------------------------
  // Branch Management
  // -------------------------

  private async getBranchSha(branch: string): Promise<string> {
    const endpoint = `/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`;
    const refData = await this.githubApiRequest<{ object: { sha: string } }>(
      endpoint
    );
    return refData.object.sha;
  }

  public async createBranch(params: BranchParams) {
    const baseSha = await this.getBranchSha(params.baseBranch);

    const endpoint = `/repos/${this.owner}/${this.repo}/git/refs`;
    const payload = {
      ref: `refs/heads/${params.branchName}`,
      sha: baseSha,
    };

    return await this.githubApiRequest(endpoint, "POST", payload);
  }

  public async getBranches() {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/branches`
    );
  }

  public async getLatestCommit(branch: string) {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/commits/${branch}`
    );
  }

  // -------------------------
  // File Management
  // -------------------------

  public async getFileContent(path: string, branch: string = "main") {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`
    );
  }

  public async updateFile(params: UpdateFileParams) {
    let currentFileData: any = null;

    try {
      currentFileData = await this.getFileContent(params.path, params.branch);
    } catch (error) {
      currentFileData = null; // File might not exist
    }

    const encodedContent = Buffer.from(params.content).toString("base64");

    const payload: any = {
      message: params.commitMessage,
      content: encodedContent,
      branch: params.branch,
    };

    if (currentFileData?.sha) {
      payload.sha = currentFileData.sha;
    }

    const endpoint = `/repos/${this.owner}/${this.repo}/contents/${params.path}`;
    return await this.githubApiRequest(endpoint, "PUT", payload);
  }

  public async getReadme(branch: string = "main") {
    return await this.getFileContent("README.md", branch);
  }

  public async updateReadme(
    content: string,
    commitMessage: string,
    branch: string = "main"
  ) {
    return await this.updateFile({
      path: "README.md",
      content,
      commitMessage,
      branch,
    });
  }

  // -------------------------
  // GitHub Actions (Workflow Management)
  // -------------------------

  public async triggerWorkflow(
    workflowFileName: string,
    inputs: { [key: string]: string },
    inputRef?: string
  ) {
    let ref = inputRef || "main";

    if (!inputRef && inputs.pr_number) {
      const prDetails = await this.getPrDetails(parseInt(inputs.pr_number));
      ref = prDetails.head.ref;
    }

    const endpoint = `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFileName}/dispatches`;
    const payload = { ref, inputs };

    return await this.githubApiRequest(endpoint, "POST", payload);
  }

  public async getWorkflowRuns() {
    return await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/actions/runs`
    );
  }

  // -------------------------
  // Pull Request Events
  // -------------------------

  public async getPrEvents(
    prNumber: number,
    per_page: number = 30,
    page: number = 1
  ) {
    // Fetch events that include merged/closed events with timestamps
    let events: any = await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/issues/${prNumber}/events?per_page=${per_page}&page=${page}`
    );

    events = events.filter((event: any) =>
      ["merged", "closed"].includes(event.event)
    );

    // Fetch timeline events (which include other activity)
    let timeline: any = await this.githubApiRequest(
      `/repos/${this.owner}/${this.repo}/issues/${prNumber}/timeline?per_page=${per_page}&page=${page}`
    );

    timeline = timeline.map((event: any) => {
      if (!event.created_at) {
        event.created_at = event?.author?.date || event?.updated_at;
      }
      return event;
    });

    // Combine both responses into one timeline
    const combined = [...events, ...timeline];

    // Sort combined events by their creation date (oldest first)
    combined.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return combined;
  }
}
