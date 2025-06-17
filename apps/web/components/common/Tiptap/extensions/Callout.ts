import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutComponent } from "./CalloutComponent";

export interface CalloutAttributes {
  icon: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: CalloutAttributes) => ReturnType;
      toggleCallout: (attributes?: CalloutAttributes) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => {
          return {
            "data-icon": attributes.icon,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
