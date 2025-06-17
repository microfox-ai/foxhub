import { Node, mergeAttributes } from "@tiptap/core";

export interface ColumnsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: () => ReturnType;
      unsetColumns: () => ReturnType;
    };
  }
}

export const Columns = Node.create<ColumnsOptions>({
  name: "columns",
  group: "block",
  content: "column+",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "columns",
        class: "columns",
      }),
      0,
    ];
  },
});
