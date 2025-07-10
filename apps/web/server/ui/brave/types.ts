export type WebSearchSource = {
  timestamp?: string;
  description?: string;
  displayDate?: string;
  title?: string;
  subType?: string; // article, generic
  icon?: {
    src: string;
    originalSrc?: string;
  };
  thumbnail?: {
    src: string;
    originalSrc?: string;
  };
  meta_media?: {
    creator?: string;
    duration?: string;
    views?: number;
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
};

export type BraveMcp = {
  webSearch: BraveWebSearchOutput;
};
