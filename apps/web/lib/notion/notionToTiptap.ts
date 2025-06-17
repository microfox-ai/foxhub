import { IN_DEV } from "@/utils/constants/appInfo";
import { NotionBlock, RichText } from "./types";

interface TiptapNode {
  type: string;
  attrs?: { [key: string]: any };
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: { [key: string]: any } }[];
}

function richTextToTiptap(richText: RichText[]): TiptapNode[] {
  if (!richText) {
    return [];
  }
  return richText.map((textItem: any) => {
    const marks: { type: string; attrs?: { [key: string]: any } }[] = [];

    if (textItem.annotations) {
      if (textItem.annotations.bold) {
        marks.push({ type: "bold" });
      }
      if (textItem.annotations.italic) {
        marks.push({ type: "italic" });
      }
      if (textItem.annotations.strikethrough) {
        marks.push({ type: "strike" });
      }
      if (textItem.annotations.underline) {
        marks.push({ type: "underline" });
      }
      if (textItem.annotations.code) {
        marks.push({ type: "code" });
      }
      if (
        textItem.annotations.color &&
        textItem.annotations.color !== "default"
      ) {
        marks.push({
          type: "textStyle",
          attrs: { color: textItem.annotations.color },
        });
      }
    }

    if (textItem.href) {
      marks.push({ type: "link", attrs: { href: textItem.href } });
    }

    return {
      type: "text",
      text: textItem.plain_text,
      marks: marks.length > 0 ? marks : undefined,
    };
  });
}

function isBlockType(
  block: NotionBlock,
  type: string
): block is NotionBlock & { [key: string]: any } {
  return block.type === type;
}

function blockToTiptap(block: NotionBlock): TiptapNode | null {
  if (isBlockType(block, "paragraph") && block.paragraph) {
    return {
      type: "paragraph",
      content: richTextToTiptap(block.paragraph.rich_text),
    };
  }
  if (isBlockType(block, "heading_1") && block.heading_1) {
    return {
      type: "heading",
      attrs: { level: 1 },
      content: richTextToTiptap(block.heading_1.rich_text),
    };
  }
  if (isBlockType(block, "heading_2") && block.heading_2) {
    return {
      type: "heading",
      attrs: { level: 2 },
      content: richTextToTiptap(block.heading_2.rich_text),
    };
  }
  if (isBlockType(block, "heading_3") && block.heading_3) {
    return {
      type: "heading",
      attrs: { level: 3 },
      content: richTextToTiptap(block.heading_3.rich_text),
    };
  }
  if (isBlockType(block, "quote") && block.quote) {
    return {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: richTextToTiptap(block.quote.rich_text),
        },
        ...(block.children ? notionToTiptap(block.children).content || [] : []),
      ],
    };
  }
  if (isBlockType(block, "code") && block.code) {
    return {
      type: "codeBlock",
      attrs: { language: block.code.language },
      content: richTextToTiptap(block.code.rich_text),
    };
  }
  if (isBlockType(block, "callout") && block.callout) {
    const icon =
      block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : "💡";
    return {
      type: "callout",
      attrs: { icon },
      content: [
        {
          type: "paragraph",
          content: richTextToTiptap(block.callout.rich_text),
        },
        ...(block.children ? notionToTiptap(block.children).content || [] : []),
      ],
    };
  }
  if (isBlockType(block, "divider") && block.divider) {
    return {
      type: "horizontalRule",
    };
  }
  if (isBlockType(block, "bulleted_list_item") && block.bulleted_list_item) {
    return {
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: richTextToTiptap(block.bulleted_list_item.rich_text),
        },
        ...(block.children ? notionToTiptap(block.children).content || [] : []),
      ],
    };
  }
  if (isBlockType(block, "numbered_list_item") && block.numbered_list_item) {
    return {
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: richTextToTiptap(block.numbered_list_item.rich_text),
        },
        ...(block.children ? notionToTiptap(block.children).content || [] : []),
      ],
    };
  }
  if (isBlockType(block, "toggle") && block.toggle) {
    return {
      type: "details",
      content: [
        {
          type: "detailsSummary",
          content: richTextToTiptap(block.toggle.rich_text),
        },
        {
          type: "detailsContent",
          content: block.children
            ? notionToTiptap(block.children).content || []
            : [],
        },
      ],
    };
  }
  if (isBlockType(block, "image") && block.image) {
    const imageUrl =
      block.image.type === "file"
        ? block.image.file?.url
        : block.image.external?.url;
    const caption =
      block.image.caption
        ?.map((c) => ("text" in c ? c.text.content : ""))
        .join("") || "";
    if (imageUrl) {
      return {
        type: "image",
        attrs: {
          src: imageUrl,
          alt: caption,
        },
      };
    }
  }

  if (IN_DEV) {
    return {
      type: "codeBlock",
      attrs: { language: "json" },
      content: [
        {
          type: "text",
          text: `// Unsupported block type: ${
            block.type
          }\n${JSON.stringify(block, null, 2)}`,
        },
      ],
    };
  }

  return null;
}

export function notionToTiptap(blocks: NotionBlock[]) {
  const contentWithNulls = blocks.map(blockToTiptap);

  // Handle lists: group list items together.
  const groupedContent: TiptapNode[] = [];
  let listType: "bulletList" | "orderedList" | null = null;
  let currentList: TiptapNode | null = null;

  contentWithNulls.forEach((tiptapNode, index) => {
    const block = blocks[index];

    if (!tiptapNode || !block) {
      listType = null;
      currentList = null;
      return;
    }

    const isBulleted = block.type === "bulleted_list_item";
    const isNumbered = block.type === "numbered_list_item";

    if (isBulleted) {
      if (listType !== "bulletList") {
        listType = "bulletList";
        currentList = {
          type: "bulletList",
          content: [],
        };
        groupedContent.push(currentList);
      }
      currentList!.content!.push(tiptapNode);
    } else if (isNumbered) {
      if (listType !== "orderedList") {
        listType = "orderedList";
        currentList = {
          type: "orderedList",
          content: [],
        };
        groupedContent.push(currentList);
      }
      currentList!.content!.push(tiptapNode);
    } else {
      listType = null;
      currentList = null;
      groupedContent.push(tiptapNode);
    }
  });

  return {
    type: "doc",
    content: groupedContent,
  };
}
