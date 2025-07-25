import { operations } from "./slack";

export type SlackUser =
  operations["getUserInfo"]["responses"]["200"]["content"]["application/json"];

export type SlackChannels =
  operations["getChannels"]["responses"]["200"]["content"]["application/json"]["channels"];

export type SlackChannel = SlackChannels[number];
