import { NextResponse } from "next/server";
import { NotionClient } from "@microfox/notion";

const client = new NotionClient({
  auth: process.env.NEXT_PUBLIC_NOTION_BOT_TOKEN || "",
});

async function getBlocksWithChildren(blockId: string): Promise<any[]> {
  const blocksResponse = await client.blocks.children.list({
    block_id: blockId,
    page_size: 100,
  });
  const blocks = blocksResponse.results;

  const blocksWithChildren = await Promise.all(
    blocks.map(async (block: any) => {
      if (block.has_children) {
        const children = await getBlocksWithChildren(block.id);
        return { ...block, children };
      }
      return block;
    })
  );

  return blocksWithChildren;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ article_id: string }> }
) {
  try {
    const { article_id } = await params;

    if (!article_id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    const page = await client.pages.retrieve({
      page_id: article_id,
    });

    const content = await getBlocksWithChildren(article_id);

    return NextResponse.json({
      page,
      content,
    });
  } catch (error) {
    console.error("Error fetching Notion page:", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion page" },
      { status: 500 }
    );
  }
}
