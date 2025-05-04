import { createSlackSDK } from "@microfox/slack-web-tiny";

export const SlackSdk = createSlackSDK({
  botToken: process.env.SLACK_OAUTH_TOKEN ?? "",
  authType: "header",
});

const IN_DEV = process.env.NODE_ENV === "development";

export const MySlackChannels = {
  test_slackbot: "#test-slackbot",
  microfox_updates: IN_DEV ? "C08KC9E8J22" : "C08KN63Q04U",
  microfox_feedback: IN_DEV ? "C08LXS0035J" : "C08LXS0035J",
};

export const MICROFOX_LOGO = `https://microfox.nyc3.cdn.digitaloceanspaces.com/logo-mini.png`;
