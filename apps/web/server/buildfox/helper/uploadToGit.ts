import { readFile } from "fs/promises";
import { globby } from "globby";
import { Octokit } from "octokit";

const clearRepoFolder = async (
  octo: Octokit,
  org: string,
  repo: string,
  branch: string,
  folderPath: string, // Relative path in the repo, e.g., "courses/my-course"
  filesToKeep: string[] // Basenames like ["README.md", "clientRequest.json"]
): Promise<{ commitSha: string; treeSha: string }> => {
  console.log(
    `Clearing folder '${folderPath}' in ${org}/${repo}/${branch}, keeping ${filesToKeep.join(", ")}`
  );

  // 1. Get the current commit and tree of the branch
  const { commitSha: currentHeadSha, treeSha: currentTreeSha } =
    await getCurrentCommit(octo, org, repo, branch);

  // 2. Get the full current tree
  const { data: currentTreeData } = await octo.rest.git.getTree({
    owner: org,
    repo,
    tree_sha: currentTreeSha,
    recursive: "true", // Use string "true" based on previous experience
  });

  // Ensure folderPath ends with a slash for correct path matching, unless it's empty (root)
  const prefix =
    folderPath && !folderPath.endsWith("/") ? `${folderPath}/` : folderPath;

  // 3. Identify files within the folder to delete
  const treeEntriesToDelete = currentTreeData.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path?.startsWith(prefix) && // Check if file is within the target folder
        item.path &&
        !filesToKeep.includes(item.path.substring(prefix.length)) // Check if filename is NOT in filesToKeep
    )
    .map((item) => ({
      path: item.path,
      mode: "100644" as const, // Or use item.mode if preserving permissions is important
      type: "blob" as const,
      sha: null, // Magic value for deletion
    }));

  if (treeEntriesToDelete.length === 0) {
    console.log("No files to delete in the specified folder.");
    // Return current commit info as no changes are needed
    return { commitSha: currentHeadSha, treeSha: currentTreeSha };
  }

  console.log(
    "Files to delete:",
    treeEntriesToDelete.map((t) => t.path)
  );

  // 4. Create the new tree with deletions applied
  const { data: newTree } = await octo.rest.git.createTree({
    owner: org,
    repo,
    tree: treeEntriesToDelete,
    base_tree: currentTreeSha, // Apply changes on top of the current tree
  });

  // 5. Create the cleanup commit
  const { data: cleanupCommit } = await octo.rest.git.createCommit({
    owner: org,
    repo,
    message: `nodeploy: chore: Cleanup folder ${folderPath} for new code commits.`,
    tree: newTree.sha,
    parents: [currentHeadSha],
  });

  // 6. Update the branch reference
  await octo.rest.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: cleanupCommit.sha,
  });

  console.log(
    `Cleanup commit created: ${cleanupCommit.sha}, Branch ${branch} updated.`
  );

  // Return the new commit info for the subsequent upload step
  return { commitSha: cleanupCommit.sha, treeSha: newTree.sha };
};

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
    // Define the type for currentCommit explicitly
    type CommitInfo = {
      commitSha: string;
      commitMessage: string;
      treeSha: string;
      parentSha: string | undefined;
    };

    let currentCommit: CommitInfo = await getCurrentCommit(
      octo,
      org,
      repo,
      branch
    );

    // --- New Cleanup Logic ---
    if (!currentCommit.commitMessage.includes("clientRequest.json")) {
      // Use RegExp literal for clarity and correctness
      const repoRelativeFolderPath = coursePath
        .replace(internalPath, "")
        .replace(/^\/+|\/+$/g, "");
      const filesToKeep = ["README.md", "CHANGELOG.md", "clientRequest.json"];

      console.log(
        `Last commit message "${currentCommit.commitMessage}" does not seem to be from this process. Performing cleanup...`
      );
      // Get only sha and treeSha from cleanup - Note: clearRepoFolder doesn't return commitSha directly
      await clearRepoFolder(
        octo,
        org,
        repo,
        branch,
        repoRelativeFolderPath,
        filesToKeep
      );
      // Fetch the full commit details for the *new* HEAD commit after cleanup
      currentCommit = await getCurrentCommit(octo, org, repo, branch); // Re-fetch current state after cleanup

      // *** ADD DELAY HERE to allow ref update to propagate ***
      console.log("Waiting 2 seconds after cleanup ref update...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // *** END DELAY ***
    } else {
      console.log(
        `Last commit message "${currentCommit.commitMessage}" includes "clientRequest.json". Skipping cleanup.`
      );
    }
    // --- End New Cleanup Logic ---

    const filesPaths = await globby(coursePath);
    const filesBlobs = await Promise.all(
      filesPaths.map(createBlobForFile(octo, org, repo))
    );
    // Important: Make sure pathsForBlobs uses the same relative path logic
    const pathsForBlobs = filesPaths.map((fullPath) =>
      // Use RegExp literal for clarity and correctness
      fullPath.replace(internalPath, "").replace(/^\//, "")
    );

    console.log(`Uploading ${filesPaths.length} files...`);
    // Create the tree for the *new* files based on the *potentially updated* currentCommit
    const newTree = await createNewTree(
      octo,
      org,
      repo,
      filesBlobs,
      pathsForBlobs,
      currentCommit.treeSha // Use treeSha from the cleanup commit if it ran, or original otherwise
    );

    const newCommit = await createNewCommit(
      octo,
      org,
      repo,
      commitMessage, // Use the user-provided or default commit message here
      newTree.sha,
      currentCommit.commitSha // Parent is the cleanup commit or original last commit
    );
    await setBranchToCommit(octo, org, repo, branch, newCommit.sha);
    console.log(
      `Upload commit ${newCommit.sha} successful. Branch ${branch} updated.`
    );
  } catch (error) {
    console.error("Error during uploadToRepo:", error); // Log the full error
  }
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
  const tree = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644` as const,
    type: `blob` as const,
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
