import { IN_DEV } from "./appInfo";

export const TEMPLATE_REPO_OWNER = "microfox-ai";
// export const TEMPLATE_REPO = IN_DEV ? "Shard-Template-Staging" : "Shard-Template";
export const TEMPLATE_REPO = "Shard-Template";

export const PROJECT_BRANCH_NAME = "project/master";
export const PROJECT_INFO_DIR = "ProjectInfo";
export const PROJECT_JSON_FILE_DIR = `${PROJECT_INFO_DIR}/botProject.json`;

export const GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
