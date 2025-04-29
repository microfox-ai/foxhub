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
