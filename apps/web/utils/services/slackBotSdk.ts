import { createSlackSDK } from "@microfox/slack-web-tiny";
import { IN_DEV } from "../constants/appInfo";

export const SLACK_BOT_OAUTH_TOKEN =
  process.env.NEXT_PUBLIC_SLACK_OAUTH_TOKEN ??
  "xoxb-1613705032464-7115299573767-URKFl8Zz5Q4yygFZ2YVr7J2O";

/** HOW TO ADD slack channel webhook
 *  Goto link - https://api.slack.com/apps/A073TMTD3GS/incoming-webhooks
 * Add a webhook for the specific channel - and add it here.
 * oauth token - xoxb-1613705032464-7115299573767-URKFl8Zz5Q4yygFZ2YVr7J2O
 */

/**
 * HOW TO MENTION USERS in slack message - you need to have users email
 * which you can get from other sources, portal app database, etc...
 * 
 * 
  const slack_user = await TMDSlackbot.getSlackUserFromEmail("subhakartikkireddy@gmail.com");
  TMDSlackbot.sendSlackMessageViaWebhook({
    text: `<@${slack_user?.id}> just entered TheMoonDevs`,
  },SlackChannelWebhooks.test_tmd_bot
  );
 */

export const MySlackChannels = {
  test_slackbot: "#test-slackbot",
  microfox_updates: IN_DEV ? "C08KC9E8J22" : "C08KN63Q04U",
  microfox_feedback: IN_DEV ? "C08LXS0035J" : "C08LXS0035J",
  reports: "C08RG5EVB9U",
};

export const SlackUsers = {
  subhakar: "U01H8NTAZD3",
};

export const MICROFOX_LOGO = `https://microfox.nyc3.cdn.digitaloceanspaces.com/logo-mini.png`;

export const slackBotSdk = createSlackSDK({
  botToken: SLACK_BOT_OAUTH_TOKEN,
  baseUrl: "https://slack.com/api",
  authType: "query",
});

//new MySlackBotSdk(SLACK_BOT_OAUTH_TOKEN);
