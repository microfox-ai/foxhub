import { createAgentClient } from "@/lib/agent-client";
import { paths } from "./slack";

const agentName = "slack";
const slackMcpClient = createAgentClient<paths>(agentName);

export const getActiveUsersIds = async (clientRequestId: string) => {
  const { data, error } = await slackMcpClient.POST("/listActiveUsers", {
    body: {
      body: {
        arguments: {
          includeBots: false,
          limit: 1000,
        },
      },
    },
    params: {
      query: {
        clientRequestId: clientRequestId,
      } as any,
    },
  });

  if (error) {
    throw new Error(String(error) || "Failed to fetch active users");
  }

  return data;
};

export const getUserInfo = async (userId: string, clientRequestId: string) => {
  const { data, error } = await slackMcpClient.POST("/getUserInfo", {
    body: {
      body: {
        arguments: {
          userId: userId,
        },
      },
    },
    params: {
      query: {
        clientRequestId: clientRequestId,
      } as any,
    },
  });

  if (error) {
    throw new Error(String(error) || "Failed to fetch user info");
  }

  return data;
};

export const getUserInfos = async (
  userIds: string[],
  clientRequestId: string
) => {
  const users = await Promise.all(
    userIds?.map((id) => getUserInfo(id, clientRequestId).catch((e) => null))
  );
  return users.filter((user) => user !== null);
};

export const getChannelsIds = async (clientRequestId: string) => {
  const { data, error } = await slackMcpClient.POST("/listChannels", {
    body: {
      body: {
        arguments: {
          limit: 1000,
        },
      },
    },
    params: {
      query: {
        clientRequestId: clientRequestId,
      } as any,
    },
  });

  if (error) {
    throw new Error(String(error) || "Failed to fetch channels");
  }

  return data;
};

export const getChannelConversationInfo = async (
  channelId: string,
  clientRequestId: string
) => {
  const { data, error } = await slackMcpClient.POST(
    "/getChannelConversationInfo",
    {
      body: {
        body: {
          arguments: {
            channelId: channelId,
          },
        },
      },
      params: {
        query: {
          clientRequestId: clientRequestId,
        } as any,
      },
    }
  );

  if (error) {
    throw new Error(String(error) || "Failed to fetch channel info");
  }

  return data;
};

export const getChannelInfo = async (
  channelId: string,
  clientRequestId: string
) => {
  const { data, error } = await slackMcpClient.POST(
    "/getChannelConversationInfo",
    {
      body: {
        body: {
          arguments: {
            channelId: channelId,
          },
        },
      },
      params: {
        query: {
          clientRequestId: clientRequestId,
        } as any,
      },
    }
  );

  if (error) {
    throw new Error(String(error) || "Failed to fetch channel info");
  }

  return data;
};
