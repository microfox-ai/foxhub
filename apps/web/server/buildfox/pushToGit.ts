//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { uploadToRepo } from "./uploadToGit";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
export const pushToGit = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  const { dataStream } = props;

  if (
    !clientRequest.repoName ||
    !clientRequest.requestDir ||
    !clientRequest.prBranch
  ) {
    throw new Error("Repo name or request dir or pr branch is required");
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    value: "Pushing to git",
  });

  const octo = new Octokit({
    auth: GITHUB_TOKEN,
  });

  console.log(
    "uploading to repo",
    clientRequest.repoName,
    clientRequest.requestDir,
    clientRequest.prBranch
  );

  await uploadToRepo(
    octo,
    `${clientRequest.repoName}/${clientRequest.requestDir}`,
    `${clientRequest.repoName}/`,
    TEMPLATE_REPO_OWNER,
    clientRequest.repoName,
    clientRequest.prBranch
  );

  // TODO: push to git file by file (if above doesn't work)
};
