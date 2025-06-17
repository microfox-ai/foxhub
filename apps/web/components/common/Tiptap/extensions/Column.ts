import { Node, mergeAttributes } from "@tiptap/core";

export interface ColumnOptions {
  HTMLAttributes: Record<string, any>;
  width: number | string;
}

export const Column = Node.create<ColumnOptions>({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      width: "0.5",
    };
  },

  addAttributes() {
    return {
      width: {
        default: this.options.width,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => {
          return {
            "data-width": attributes.width,
            style: `width: ${parseFloat(attributes.width) * 100}%`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "column",
        class: "column",
      }),
      0,
    ];
  },
});
