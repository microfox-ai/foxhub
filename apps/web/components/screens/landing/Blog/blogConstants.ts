import { NotionClient } from "@microfox/notion";

const client = new NotionClient({
  auth: process.env.NOTION_BOT_TOKEN || "",
  notionVersion: "2025-09-03",
});

export const MAIN_BLOG_DATABASE = {
  // databaseId: "243416a63cde81f8bec7c902ab9f5699",
  data_source_id: "243416a6-3cde-8167-8a1a-000b9106217a"
};
