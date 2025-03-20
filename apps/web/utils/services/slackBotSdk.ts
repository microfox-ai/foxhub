export const SLACK_BOT_OAUTH_TOKEN =
  process.env.NEXT_PUBLIC_SLACK_OAUTH_TOKEN ||
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

/** TODO/CHANGES
 * In future need to shift webhook URLs inisde class,
 * secure them outside by fetching hooks, and make the sdk more compact
 * (maybe chat.postmessage is better than webhooks in the end). */
export const SlackChannelWebhooks = {
  b_general:
    "https://hooks.slack.com/services/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",
  d_management:
    "https://hooks.slack.com/services/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",

  test_tmd_bot:
    "https://hooks.slack.com/services/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",
};

export const SlackChannels = {
  y_moon_reminders: "C07A2HJUEPN",
  y_pay_reminders: "C074572BB2T",
  executive_channel: "C066K6FKU1X",
  management_channel: "C06944N1NQ7",
  test_slackbot: "C0747DURBHT",
  b_coreteam: "C065V7MN0AE",
  p_3_custombots: "C08GNN16TV2",
};

export const SlackUsers = {
  subhakar: "U01H8NTAZD3",
};

export type channelType =
  (typeof SlackChannelWebhooks)[keyof typeof SlackChannelWebhooks];

export type SlackMessageType = {
  text?: string;
  blocks?: any[];
  channel?: string;
  user_id?: string;
  attachments?: any[];
  as_user?: boolean;
  icon_emoji?: string;
  icon_url?: string;
  link_names?: boolean;
  metadata?: string;
  mrkdwn?: boolean;
  parse?: string;
  reply_broadcast?: boolean;
  thread_ts?: string;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  username?: string;
  ts?: string;
};

export type ClientInfo = {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  teamSize?: string;
  preferredDate?: string;
  industry?: string;
  requirementType?: string;
};

export type MessageInfo = {
  text: string;
  imageUrl: string;
  user_id?: string;
  channel?: string;
  altText?: string;
};

export interface SlackButtonAction {
  action_id: string;
  block_id: string;
  text: {
    type: string;
    text: string;
    emoji: boolean;
  };
  value: string;
  style: string;
  type: string;
  action_ts: string;
}

export interface SlackInteractionPayload {
  type: string;
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  api_app_id: string;
  token: string;
  container: {
    type: string;
    message_ts: string;
    channel_id: string;
    is_ephemeral: boolean;
  };
  trigger_id: string;
  team: {
    id: string;
    domain: string;
  };
  enterprise: any;
  is_enterprise_install: boolean;
  channel: {
    id: string;
    name: string;
  };
  message: {
    subtype: string;
    text: string;
    type: string;
    ts: string;
    bot_id: string;
    blocks: any[];
  };
  state: {
    values: any;
  };
  response_url: string;
  actions: SlackButtonAction[];
}

/**
 * requires OAUTH_TOKEN to initialise.
 */
export class SlackBotSdk {
  public bot_token = SLACK_BOT_OAUTH_TOKEN;
  public user_list: any[] = [];

  constructor(_token?: string) {
    console.log("SlackBotSdk initialized");
    this.bot_token = _token || SLACK_BOT_OAUTH_TOKEN;
  }
  // fetch slack users to use mentions.
  getSlackUsers = async () => {
    try {
      const data = new URLSearchParams();
      data.append("token", this.bot_token);
      const response = await fetch("https://slack.com/api/users.list", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      });
      const resp_data = await response.json();
      if (!resp_data.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const members = resp_data.members.filter(
        (m: any) => m.is_bot == false && !m.deleted,
      );
      // console.log("Slack received users list", members);
      return members;
    } catch (err) {
      console.log(err);
    }
  };
  /**
   * for backend, you need to pass usersList as a parameter, store using the above
   * function on startup or every period of  interval
   * or replace localStorage with something else
   *  */
  getSlackUserFromEmail = async (userEmail: string, usersList?: any[]) => {
    if (usersList?.length === 0 || !usersList) {
      const _usersList = localStorage.getItem("slackUsersList");
      usersList = JSON.parse(_usersList || "[]");
    }
    if (usersList?.length === 0 || !usersList) {
      usersList = this.user_list;
    }
    if (usersList?.length === 0 || !usersList) {
      usersList = await this.getSlackUsers();
      localStorage.setItem("slackUsersList", JSON.stringify(usersList));
    }
    if (usersList != undefined) this.user_list = usersList;
    const _user = usersList?.find((u: any) => u.profile.email === userEmail);
    console.log(_user, usersList);
    return _user;
  };
  // post a message using webhook - deprecated.
  sendSlackMessageViaWebhook = async (
    message: SlackMessageType,
    channel: channelType,
  ) => {
    try {
      if (channel) {
        const response = await fetch(channel, {
          method: "POST",
          body: JSON.stringify(message),
        });

        const resp_data = await response.json();
        if (!resp_data?.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        console.log("Slack message sent successfully");
        return resp_data;
      } else {
        console.error("No Slack channel provided");
      }
    } catch (error) {
      console.error("Error sending Slack message:", error);
      throw error;
    }
  };

  // post a message using API. passin channel or user_id
  sendSlackMessageviaAPI = async (message: SlackMessageType) => {
    try {
      if (!message?.user_id && !message?.channel) {
        throw new Error("Either channel or user_id must be provided"); // Throw error if neither is provided
      }

      let channel = message?.user_id || message?.channel;

      const data = new URLSearchParams();
      data.append("token", SLACK_BOT_OAUTH_TOKEN);
      data.append("channel", channel || "");
      if (message.attachments) {
        data.append("attachments", JSON.stringify(message.attachments));
      }
      if (message.text) {
        data.append("text", message.text);
      }
      if (message.blocks) {
        data.append("blocks", JSON.stringify(message.blocks));
      }

      const url = message?.ts
        ? "https://slack.com/api/chat.update"
        : "https://slack.com/api/chat.postMessage";

      if (message?.ts) {
        data.append("ts", message?.ts);
      }

      if (message?.unfurl_links) {
        data.append("unfurl_links", message?.unfurl_links.toString());
      }

      if (message?.unfurl_media) {
        data.append("unfurl_media", message?.unfurl_media.toString());
      }

      if (message?.username) {
        data.append("username", message?.username);
      }

      if (message?.icon_emoji) {
        data.append("icon_emoji", message?.icon_emoji);
      }

      if (message?.icon_url) {
        data.append("icon_url", message?.icon_url);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      console.log("Slack message sent successfully");
      return response.json();
    } catch (error) {
      console.error("Error sending Slack message:", error);
      throw error;
    }
  };

  buildPlainMarkdownSection = (message: string) => {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    };
  };

  buildFieldsSection = (fields: any[]) => {
    return {
      type: "section",
      fields: fields,
    };
  };

  buildFieldsMarkdown = (fields: string[]) => {
    return fields.map((field) => ({
      type: "mrkdwn",
      text: field,
    }));
  };

  sendSlackMessageWithImage = async (messageInfo: MessageInfo) => {
    const msg: SlackMessageType = {
      text: messageInfo.text,
      user_id: messageInfo.user_id || "",
      channel: messageInfo.channel || "",
      attachments: [
        {
          fallback: messageInfo.altText,
          image_url: messageInfo.imageUrl,
        },
      ],
    };
    await this.sendSlackMessageviaAPI(msg);
  };

  setSlackReminder = async ({
    time,
    message,
    channel,
  }: {
    time: string;
    message: string;
    channel: string;
  }) => {
    try {
      const year = parseInt(time.substring(0, 4), 10);
      const month = parseInt(time.substring(4, 6), 10) - 1;
      const day = parseInt(time.substring(6, 8), 10);
      const hours = parseInt(time.substring(9, 11), 10);
      const minutes = parseInt(time.substring(11, 13), 10);
      const seconds = parseInt(time.substring(13, 15), 10);
      let date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

      date.setHours(date.getHours() - 5);
      date.setMinutes(date.getMinutes() - 30);

      const unixTimestamp = Math.floor(date.getTime() / 1000);

      const data = new URLSearchParams();
      data.append("token", SLACK_BOT_OAUTH_TOKEN);
      data.append("text", message);
      data.append("post_at", unixTimestamp.toString());
      data.append("channel", channel);

      const response = await fetch(
        "https://slack.com/api/chat.scheduleMessage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: data,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const jsonResponse = await response.json();
      console.log("Reminder set successfully:", jsonResponse);
    } catch (error) {
      console.error("Error setting Slack reminder:", error);
      throw error;
    }
  };
}
