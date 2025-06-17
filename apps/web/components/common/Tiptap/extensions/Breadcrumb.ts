import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import BreadcrumbComponent from "./BreadcrumbComponent";

export const Breadcrumb = Node.create({
  name: "breadcrumb",
  group: "block",
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="breadcrumb"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "breadcrumb" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BreadcrumbComponent);
  },
});
