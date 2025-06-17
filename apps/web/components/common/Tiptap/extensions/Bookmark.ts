import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BookmarkComponent } from "@/components/common/Tiptap/extensions/BookmarkComponent";

export interface BookmarkAttributes {
  url: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: (attributes: BookmarkAttributes) => ReturnType;
    };
  }
}

export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  content: "block+",
  atom: false,

  addAttributes() {
    return {
      url: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-url"),
        renderHTML: (attributes) => {
          return {
            "data-url": attributes.url,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "bookmark" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkComponent);
  },
});
