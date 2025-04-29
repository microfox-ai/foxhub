import { App } from "@octokit/app";

export const registerGitHubHooks = (_app: App) => {
  _app.webhooks.on("installation", async (event) => {
    console.log("Installation event received:", event);
    //_app.octokit.request
  });

  _app.webhooks.on("installation_repositories", async (event) => {
    console.log("Installation repositories event received:", event);
  });

  _app.webhooks.on("push", async (event) => {
    console.log("Push event received:", event);
  });

  _app.webhooks.on("issues.opened", async (event) => {
    console.log("Issue opened event received:", event);
  });

  _app.webhooks.on("issue_comment.created", async (event) => {
    console.log("Issue comment created event received:", event);
  });

  _app.webhooks.on("pull_request.opened", async ({ payload, octokit }) => {
    console.log("Pull request opened event received:", payload);

    const prTitle = payload.pull_request.title;
    const prBody = payload.pull_request.body;
    const prNumber = payload.pull_request.number;
    const repoOwner = payload.repository.owner.login;
    const repoName = payload.repository.name;

    // Check if the title starts with "packagefox:" (case-insensitive)
    if (prTitle.toLowerCase().startsWith("packagefox:")) {
      if (prBody) {
        // Extract URLs from the body
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const detectedUrls = prBody.match(urlRegex);

        if (detectedUrls && detectedUrls.length > 0) {
          // Construct the comment body
          const commentBody = `URLs detected:\n${detectedUrls.join("\n")}`;

          // Post a comment on the PR
          try {
            await octokit.request(
              `POST /repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`,
              {
                body: commentBody,
              }
            );
            console.log(`Commented on PR #${prNumber} with detected URLs.`);
          } catch (error) {
            console.error(`Failed to comment on PR #${prNumber}:`, error);
          }
        } else {
          console.log(
            `PR #${prNumber} title matched but no URLs found in the body.`
          );
          // Optionally, comment that no URLs were found
          // try {
          //   await octokit.issues.createComment({
          //     owner: repoOwner,
          //     repo: repoName,
          //     issue_number: prNumber,
          //     body: "Title indicated URL processing, but no URLs were found in the description.",
          //   });
          // } catch (error) {
          //   console.error(`Failed to comment on PR #${prNumber} (no URLs found):`, error);
          // }
        }
      } else {
        console.log(`PR #${prNumber} title matched but the body is empty.`);
        // Optionally, comment that the body is empty
        // try {
        //   await octokit.issues.createComment({
        //     owner: repoOwner,
        //     repo: repoName,
        //     issue_number: prNumber,
        //     body: "Title indicated URL processing, but the description is empty.",
        //   });
        // } catch (error) {
        //   console.error(`Failed to comment on PR #${prNumber} (empty body):`, error);
        // }
      }
    }

    // --- Create Task and Subtasks in MongoDB ---
    // try {
    //   const newTask = new Task({
    //     pullRequestId: prPayload.pull_request.id,
    //     pullRequestUrl: prPayload.pull_request.html_url,
    //     repositoryOwner: prPayload.repository.owner.login,
    //     repositoryName: prPayload.repository.name,
    //     status: 'pending',
    //   });
    //   await newTask.save();
    //   console.log(`Created Task ${newTask._id} for PR #${prPayload.pull_request.number}`);

    //   const subtaskDefinitions = defineSubtasksForPr(prPayload);
    //   const subtaskDocs = subtaskDefinitions.map(def => ({
    //     taskId: newTask._id,
    //     name: def.name,
    //     status: SubtaskStatus.Pending,
    //     data: def.data,
    //     attempts: 0,
    //   }));

    //   if (subtaskDocs.length > 0) {
    //     await Subtask.insertMany(subtaskDocs);
    //     console.log(`Created ${subtaskDocs.length} Subtasks for Task ${newTask._id}`);
    //   } else {
    //     console.log(`No subtasks defined for Task ${newTask._id}. Marking task as completed.`);
    //     newTask.status = 'completed'; // Or handle as appropriate
    //     await newTask.save();
    //   }

    // } catch (error) {
    //   console.error(`Error creating task for PR #${prPayload.pull_request.number}:`, error);
    //   // Optional: Add error handling/retry logic or notify admin
    // }
    // ------------------------------------------

    // const body = event.payload.pull_request.body;
    // const title = event.payload.pull_request.title;
    // const user = event.payload.pull_request.user.login;
    // const repo = event.payload.repository.name;
    // const url = event.payload.pull_request.html_url;
    // const status = event.payload.pull_request.state;
  });

  _app.webhooks.on("pull_request.edited", async (event) => {
    console.log("Pull request edited event received:", event);
  });
};
