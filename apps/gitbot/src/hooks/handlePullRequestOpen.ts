import { MICROFOX_LOGO, MySlackChannels, SlackSdk } from "../utils/slack.ts";

export const handlePullRequestOpen = (payload: any, octokit: any) => {
  console.log(
    "Pull request opened event received:",
    JSON.stringify(payload, null, 2)
  );

  const prTitle = payload.pull_request.title;
  const prBody = payload.pull_request.body;
  const prNumber = payload.pull_request.number;
  const repoOwner = payload.repository.owner.login;
  const repoName = payload.repository.name;

  if (prTitle.toLocaleLowerCase().includes("version packages")) {
    console.log(`PR #${prNumber} title matches "version packages" pattern`);
    SlackSdk.sendMessage({
      channel: MySlackChannels.microfox_updates,
      text: `New Packages are awaiting release: Please verify them & merge at link: ${payload.pull_request.html_url}`,
      icon_url: MICROFOX_LOGO,
      author_name: "PackageFox",
    });
    return;
  }
};
