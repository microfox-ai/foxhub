import { Node, mergeAttributes } from "@tiptap/core";

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="table-of-contents"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "table-of-contents" }),
    ];
  },
});
