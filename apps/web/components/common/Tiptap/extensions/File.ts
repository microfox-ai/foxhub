import { Node, mergeAttributes } from "@tiptap/core";

export interface FileOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    file: {
      setFile: (options: {
        src: string;
        title: string;
        type: string;
      }) => ReturnType;
    };
  }
}

export const File = Node.create<FileOptions>({
  name: "file",
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
      title: {
        default: "File",
      },
      type: {
        default: "application/octet-stream",
      },
    };
  },

  addCommands() {
    return {
      setFile:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const fileType = (HTMLAttributes.type as string) || "";
    const extension =
      (HTMLAttributes.title as string).split(".").pop()?.toLowerCase() || "";

    const getIcon = () => {
      if (fileType.startsWith("image/")) return "🖼️";
      if (fileType.startsWith("video/")) return "🎬";
      if (fileType.startsWith("audio/")) return "🎵";
      if (extension === "pdf") return "📄";
      if (["doc", "docx", "txt"].includes(extension)) return "📝";
      if (["xls", "xlsx", "csv"].includes(extension)) return "📊";
      if (["zip", "rar", "7z"].includes(extension)) return "📦";
      return "📁";
    };

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "file",
        class: "file-node not-prose",
      }),
      ["div", { class: "icon" }, getIcon()],
      [
        "div",
        { class: "details" },
        [
          "a",
          {
            href: HTMLAttributes.src,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "title",
          },
          HTMLAttributes.title,
        ],
      ],
    ];
  },
});
