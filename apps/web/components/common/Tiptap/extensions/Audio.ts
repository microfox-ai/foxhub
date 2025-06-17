import { Node, mergeAttributes } from "@tiptap/core";

export interface AudioOptions {
  HTMLAttributes: Record<string, any>;
}

export const Audio = Node.create<AudioOptions>({
  name: "audio",
  group: "block",
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "audio",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "audio",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: true,
      }),
      ["source", { src: HTMLAttributes.src }],
    ];
  },
});
