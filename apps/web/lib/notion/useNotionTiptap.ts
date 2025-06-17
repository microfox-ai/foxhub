"use client";

import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import UniqueId from "tiptap-unique-id";
import Heading from "@tiptap/extension-heading";
import { useEffect, useRef } from "react";
import { notionToTiptap } from "./notionToTiptap";
import { NotionBlock } from "./types";
import { Callout } from "@/components/common/Tiptap/extensions/Callout";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Details } from "@/components/common/Tiptap/extensions/Details";
import { DetailsSummary } from "@/components/common/Tiptap/extensions/DetailsSummary";
import { DetailsContent } from "@/components/common/Tiptap/extensions/DetailsContent";

export function useNotionTiptap(blocks: NotionBlock[]) {
  const editor = useEditor({
    editable: false,
    content: "",
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: {},
        blockquote: {},
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            id: {
              default: null,
            },
          };
        },
      }),
      Image,
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Callout,
      TextStyle,
      Color,
      Details,
      DetailsSummary,
      DetailsContent,
      UniqueId.configure({
        types: ["heading"],
        generateID: (node: any) => {
          const text = node.textContent
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          return text;
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "ProseMirror",
      },
    },
  });

  const hasSetContent = useRef(false);

  useEffect(() => {
    if (editor && blocks && blocks.length > 0 && !hasSetContent.current) {
      const tiptapContent = notionToTiptap(blocks);
      editor.commands.setContent(tiptapContent);
      hasSetContent.current = true;
    }
  }, [blocks, editor]);

  return editor;
}
