export type ImageSet = {
  src: string;
  type?: string;
  originalSrc?: string;
  size?: string;
  srcHeight?: number;
  srcWidth?: number;
  title?: string;
  description?: string;
  url?: string;
  imagePageUrl?: string;
  pageUrl?: string;
  set?: {
    src: string;
    originalSrc?: string;
    size?: string;
    srcHeight?: number;
    srcWidth?: number;
  }[];
};
