import { NotionClient } from "@microfox/notion";
import { cache } from "react";

const client = new NotionClient({
  auth: process.env.NOTION_BOT_TOKEN || "",
});

// Cache the blocks fetching function
const getBlocksWithChildren = cache(
  async (blockId: string, token?: string): Promise<any[]> => {
    let notionClient: NotionClient = client;
    if (token) {
      notionClient = new NotionClient({
        auth: token,
      });
    }
    const blocksResponse = await notionClient.blocks.children.list({
      block_id: blockId,
      page_size: 100,
    });
    const blocks = blocksResponse.results;

    const blocksWithChildren = await Promise.all(
      blocks.map(async (block: any) => {
        if (block.has_children) {
          const children = await getBlocksWithChildren(block.id, token);
          return { ...block, children };
        }
        return block;
      })
    );

    return blocksWithChildren;
  }
);

// Cache the page retrieval function
const getNotionPage = cache(async (pageId: string, token?: string) => {
  if (token) {
    const notionClient = new NotionClient({
      auth: token,
    });
    return await notionClient.pages.retrieve({
      page_id: pageId,
    });
  }
  return await client.pages.retrieve({
    page_id: pageId,
  });
});

export const getArticleData = cache(
  async (article_id: string, token?: string) => {
    // Use cached functions
    const [page, content] = await Promise.all([
      getNotionPage(article_id, token),
      getBlocksWithChildren(article_id, token),
    ]);

    return { page, content };
  }
);
