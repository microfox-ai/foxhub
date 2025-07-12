import { ImageSet } from "../types";

export type WebSearchSource = {
  timestamp?: string;
  description?: string;
  displayDate?: string;
  title?: string;
  subType?: string; // article, generic
  icon?: Partial<ImageSet>;
  thumbnail?: Partial<ImageSet>;
  meta_media?: {
    creator?: string;
    duration?: string;
    views?: number;
    placeholder?: string;
    height?: number;
    width?: number;
  };
  meta_url?: {
    favicon?: string;
    hostname?: string;
    domain?: string; // netloc
    breadcrumb?: string;
  };
  url: string;
};

export type BraveWebSearchOutput = {
  video_sources: WebSearchSource[];
  web_sources: WebSearchSource[];
  image_sources: WebSearchSource[];
};

export type BraveMcp = {
  webSearch: BraveWebSearchOutput;
  imageSearch: BraveWebSearchOutput;
};
