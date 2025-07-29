"use client";

import {
  FilloutFormIds,
  InviteLinks,
} from "@/components/screens/landing/FilloutPopupProvider";
import { AgentInfo } from "@microfox/types";
import { usePathname } from "next/navigation";
import useSWR from "swr";

export const getAgentNameFromPath = (pathname: string) => {
  const subdomain = pathname.split("/")?.[2];
  if (subdomain?.includes("slack")) {
    return "slack";
  }
  if (subdomain?.includes("reddit")) {
    return "ragreddit";
  }
  return subdomain;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useAgentData = (agentNames?: string[]) => {
  const pathname = usePathname();
  const agentNamesString =
    agentNames?.join(",") ?? getAgentNameFromPath(pathname);
  return useSWR<AgentInfo[]>(
    `/api/agents/infos?agentNames=${agentNamesString}`,
    fetcher
  );
};

export const getFilloutFormIdFromAgentName = (agentName: string) => {
  if (agentName === "slack") {
    return FilloutFormIds.SlackDDemo;
  }
  if (agentName === "ragreddit") {
    return FilloutFormIds.RedditDemo;
  }
  return FilloutFormIds.SlackDDemo;
};

export const getInviteLinkFromAgentName = (agentName: string) => {
  if (agentName === "slack") {
    return InviteLinks.Slack;
  }
  return InviteLinks.Slack;
};
