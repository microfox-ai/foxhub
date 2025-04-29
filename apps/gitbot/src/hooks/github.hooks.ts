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

  _app.webhooks.on("pull_request.opened", async (event) => {
    console.log("Pull request opened event received:", event);

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
