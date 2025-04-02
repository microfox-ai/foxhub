//   await updateFileToGit(props.dataStream, {
//     filePath: `${clientRequest.requestDir}/${filePath}`,
//     content,
//     commitMessage: `Update ${fileName}`,
//     branchName: clientRequest.prBranch,
//     repoName: clientRequest.repoName,
//   });
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { uploadToRepo } from "../buildfox/helper/uploadToGit";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { TaskInstanceMetaType } from "../convertfox/types";
import dayjs from "dayjs";
export const deployViaGit = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType
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
    value: "Deploying a test version of automation",
  });

  const octo = new Octokit({
    auth: GITHUB_TOKEN,
  });

  octo.rest.actions.createWorkflowDispatch({
    owner: TEMPLATE_REPO_OWNER,
    repo: clientRequest.repoName,
    workflow_id: "deploy.yml",
    ref: clientRequest.prBranch,
  });

  // TODO: push to git file by file (if above doesn't work)
};
