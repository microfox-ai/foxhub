import { NotionClient } from "@microfox/notion";

const client = new NotionClient({
  auth: process.env.NOTION_BOT_TOKEN || "",
});

export const MAIN_BLOG_DATABASE = {
  databaseId: "243416a63cde81f8bec7c902ab9f5699",
};
