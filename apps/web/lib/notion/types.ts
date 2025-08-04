import { RichText as OriginalRichText } from "@microfox/notion";

export type RichText = OriginalRichText & {
  plain_text?: string;
  href?: string | null;
};

export interface NotionBlock {
  object: "block";
  id: string;
  type: string;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  paragraph?: {
    rich_text: RichText[];
    color: string;
  };
  heading_1?: {
    rich_text: RichText[];
    is_toggleable: boolean;
  };
  heading_2?: {
    rich_text: RichText[];
    is_toggleable: boolean;
  };
  heading_3?: {
    rich_text: RichText[];
    is_toggleable: boolean;
  };
  bulleted_list_item?: {
    rich_text: RichText[];
  };
  numbered_list_item?: {
    rich_text: RichText[];
  };
  quote?: {
    rich_text: RichText[];
  };
  code?: {
    rich_text: RichText[];
    language: string;
  };
  image?: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: RichText[];
  };
  divider?: {};
  callout?: {
    rich_text: RichText[];
    icon?: {
      type: "emoji";
      emoji: string;
    };
  };
  table?: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
  };
  table_row?: {
    cells: RichText[][];
  };
  children?: NotionBlock[]; // For nested blocks
}
