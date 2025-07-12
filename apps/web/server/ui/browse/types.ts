import { ImageSet } from "../types";

export type BrowseOutput = {
  image_sources: ImageSet[];
};

export type BrowseMcp = {
  extractImagesFromURL: BrowseOutput;
};
