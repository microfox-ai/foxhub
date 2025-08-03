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
import { TableOfContents } from "@/components/common/Tiptap/extensions/TableOfContents";
import { Youtube } from "@/components/common/Tiptap/extensions/Youtube";
import { VideoNode } from "@/components/common/Tiptap/extensions/VideoNode";
import { Columns } from "@/components/common/Tiptap/extensions/Columns";
import { Column } from "@/components/common/Tiptap/extensions/Column";
import { File } from "@/components/common/Tiptap/extensions/File";
import { Audio } from "@/components/common/Tiptap/extensions/Audio";
import { Bookmark } from "@/components/common/Tiptap/extensions/Bookmark";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

export function useNotionTiptap(blocks: NotionBlock[]) {
  const editor = useEditor({
    editable: false,
    content: "",
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: {},
        blockquote: {},
      }),
      Table.configure({
        HTMLAttributes: {
          style: "border-collapse: collapse; border-spacing: 0; width: 100%;",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          style: "border: 1px solid #ddd; padding: 8px;",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          style: "border: 1px solid #ddd; padding: 8px;",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          style:
            "border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;",
        },
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
      TableOfContents,
      Youtube,
      VideoNode,
      Columns,
      Column,
      File,
      Audio,
      Bookmark,
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
