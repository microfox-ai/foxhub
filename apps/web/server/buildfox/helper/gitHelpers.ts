import { GITHUB_TOKEN } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";

export const octokitSdk: Octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// export const updateFileToGit = async (
//   dataStream: DataStreamWriter,
//   options: {
//     filePath: string;
//     content: string;
//     commitMessage: string;
//     branchName: string;
//     repoName: string;
//     owner?: string;
//   }
// ) => {
//   const response = await octokitSdk.rest.repos.createOrUpdateFileContents({
//     owner: options.owner ?? PROJECT_REPO_OWNER,
//     repo: options.repoName,
//     path: options.filePath,
//     message: options.commitMessage,
//     content: options.content,
//     branch: options.branchName,
//   });

//   return response;
// };

// export const getAppFolderContents = async (
//   dataStream: DataStreamWriter,
//   options: {
//     path: string;
//     branchName: string;
//     repoName: string;
//     owner?: string;
//   }
// ) => {
//   const response = await octokitSdk.rest.repos.getContent({
//     owner: options.owner ?? PROJECT_REPO_OWNER,
//     repo: options.repoName,
//     path: options.path,
//     branch: options.branchName,
//   });

//   return response;
// };
