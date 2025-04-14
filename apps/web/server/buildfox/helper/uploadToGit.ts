import { Octokit } from "octokit";
import glob from "globby";
import path from "path";
import { readFile } from "fs/promises";

export const uploadToRepo = async (
  octo: Octokit,
  coursePath: string,
  internalPath: string,
  org: string,
  repo: string,
  branch: string = `master`,
  commitMessage: string = `My commit message`
) => {
  try {
    // gets commit's AND its tree's SHA

    const lastCommit = await getCurrentCommit(octo, org, repo, branch);
    const currentCommit = lastCommit.commitMessage.includes(
      "clientRequest.json"
    )
      ? lastCommit
      : lastCommit.commitMessage.includes("microcode")
        ? await revertCommit(
          octo,
          org,
          repo,
          branch,
          lastCommit.commitSha,
          lastCommit.treeSha,
          lastCommit.parentSha
        ) : lastCommit;

    const filesPaths = await glob(coursePath);
    let filesBlobs = await Promise.all(
      filesPaths.map((filePath) => {
        if (filePath.includes("node_modules") || filePath.includes("env.json") || filePath.includes("dist") || filePath.includes(".build")) {
          return null
        } else {
          return createBlobForFile(octo, org, repo)(filePath)
        }
      })
    );
    filesBlobs = filesBlobs.filter((blob) => blob !== null)
    const pathsForBlobs = filesPaths.map((fullPath) =>
      //path.relative(coursePath, fullPath)
      fullPath.replace(internalPath, "")
    );
    //console.log("filesBlobs", filesBlobs.length, pathsForBlobs);
    const newTree = await createNewTree(
      octo,
      org,
      repo,
      filesBlobs,
      pathsForBlobs,
      currentCommit.treeSha
    );
    //console.log("newTree", newTree);
    const newCommit = await createNewCommit(
      octo,
      org,
      repo,
      commitMessage,
      newTree.sha,
      currentCommit.commitSha
    );
    await setBranchToCommit(octo, org, repo, branch, newCommit.sha);
  } catch (error) {
    console.log("error", error);
  }
};

const revertCommit = async (
  octo: Octokit,
  org: string,
  repo: string,
  branch: string,
  commitSha: string,
  treeSha: string,
  parentSha?: string
) => {
  // Get the parent commit's tree SHA
  const { data: parentCommit } = await octo.rest.git.getCommit({
    owner: org,
    repo,
    commit_sha: parentSha ?? commitSha,
  });

  // Create a revert commit using the parent's tree
  const { data: newCommit } = await octo.rest.git.createCommit({
    owner: org,
    repo,
    message: `nodeploy: Revert commit ${commitSha}`,
    parents: [commitSha],
    tree: parentCommit.tree.sha, // Use parent's tree instead of current tree
  });

  // Update the branch reference
  const { data: refData } = await octo.rest.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return {
    commitSha: newCommit.sha,
    treeSha: parentCommit.tree.sha, // Return parent's tree SHA
  };
};

const getCurrentCommit = async (
  octo: Octokit,
  org: string,
  repo: string,
  branch: string = "master"
) => {
  const { data: refData } = await octo.rest.git.getRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
  });
  const commitSha = refData.object.sha;
  const { data: commitData } = await octo.rest.git.getCommit({
    owner: org,
    repo,
    commit_sha: commitSha,
  });
  return {
    commitSha,
    commitMessage: commitData.message,
    treeSha: commitData.tree.sha,
    parentSha: commitData.parents[0]?.sha,
  };
};

// Notice that readFile's utf8 is typed differently from Github's utf-8
const getFileAsUTF8 = (filePath: string) => readFile(filePath, "utf8");

const createBlobForFile =
  (octo: Octokit, org: string, repo: string) => async (filePath: string) => {
    const content = await getFileAsUTF8(filePath);
    const blobData = await octo.rest.git.createBlob({
      owner: org,
      repo,
      content,
      encoding: "utf-8",
    });
    return blobData.data;
  };

const createNewTree = async (
  octo: Octokit,
  owner: string,
  repo: string,
  blobs: any[],
  paths: string[],
  parentTreeSha: string
) => {
  // My custom config. Could be taken as parameters
  const tree: any = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644`,
    type: `blob`,
    sha,
  }));
  const { data } = await octo.rest.git.createTree({
    owner,
    repo,
    tree,
    base_tree: parentTreeSha,
  });
  return data;
};

const createNewCommit = async (
  octo: Octokit,
  org: string,
  repo: string,
  message: string,
  currentTreeSha: string,
  currentCommitSha: string
) =>
  (
    await octo.rest.git.createCommit({
      owner: org,
      repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha],
    })
  ).data;

const setBranchToCommit = (
  octo: Octokit,
  org: string,
  repo: string,
  branch: string = `master`,
  commitSha: string
) =>
  octo.rest.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
  });
