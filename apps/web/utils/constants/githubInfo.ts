import { IN_DEV } from "./appInfo";

export const TEMPLATE_REPO_OWNER = "microfox-ai";
// export const TEMPLATE_REPO = IN_DEV ? "Shard-Template-Staging" : "Shard-Template";
export const TEMPLATE_REPO = "Shard-Template";
export const PUBLISHED_SHARD_REPO = "published-shards";

export const PROJECT_REPO_OWNER =
  process.env.NEXT_PUBLIC_APP_BASE_URL === "https://staging.microfox.app" ||
  IN_DEV
    ? "microfox-projects-staging"
    : "microfox-projects-production";

export const PROJECT_BRANCH_NAME = "project/master";
export const PROJECT_INFO_DIR = "ProjectInfo";
export const PROJECT_JSON_FILE_DIR = `${PROJECT_INFO_DIR}/botProject.json`;

export const GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
export const GITHUB_ACTION_POLICIES =
  process.env.TMD_GITHUB_ACTION_POLICIES ?? process.env.TMD_GITHUB_TOKEN;
