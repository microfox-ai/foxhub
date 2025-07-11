import { ToolUIPart } from "ai";
import { BraveMcp, BraveWebSearchOutput } from "./types";

const mapBraveWebSearch = (data: any, part?: ToolUIPart) => {
  let output: BraveWebSearchOutput = {
    video_sources: [],
    web_sources: [],
    image_sources: [],
  };
  if (data.videos) {
    output.video_sources = data.videos.results
      ?.filter((video: any) => video)
      .map((video: any) => ({
        timestamp: video.page_age,
        description: video.description,
        displayDate: video.age,
        title: video.title,
        thumbnail: {
          src: video?.thumbnail?.src,
          originalSrc: video?.thumbnail?.original,
          srcHeight: video?.thumbnail?.height,
          srcWidth: video?.thumbnail?.width,
        },
        meta_media: {
          creator: video.video?.creator,
          duration: video.video?.duration,
          views: video.video?.views,
        },
        meta_url: {
          favicon: video.meta_url?.favicon,
          hostname: video.meta_url?.hostname,
          domain: video.meta_url?.domain,
          breadcrumb: video.meta_url?.path,
        },
        url: video.url,
      }));
  }
  if (data.web) {
    output.web_sources = data.web.results
      ?.filter((web: any) => web)
      .map((web: any) => ({
        timestamp: web.page_age,
        description: web.description,
        displayDate: web.age,
        title: web.title,
        thumbnail:
          !web.thumbnail?.logo && web.thumbnail
            ? {
                src: web.thumbnail?.src,
                originalSrc: web.thumbnail?.original,
                srcHeight: web.thumbnail?.height,
                srcWidth: web.thumbnail?.width,
              }
            : undefined,
        icon: web.thumbnail?.logo
          ? {
              src: web.thumbnail.logo.src,
              originalSrc: web.thumbnail.logo.original,
            }
          : undefined,
        subType: web.subType,
        meta_url: {
          favicon: web.meta_url?.favicon,
          hostname: web.meta_url?.hostname,
          domain: web.meta_url?.domain,
          breadcrumb: web.meta_url?.path,
        },
        url: web.url,
      }));
  }
  return output;
};

const mapBraveImageSearch = (data: any, part?: ToolUIPart) => {
  let output: BraveWebSearchOutput = {
    image_sources: [],
    web_sources: [],
    video_sources: [],
  };
  if (data.results) {
    output.image_sources = data.results
      ?.filter((image: any) => image)
      .map((image: any) => ({
        timestamp: image.page_age,
        description: image.description,
        displayDate: image.age,
        title: image.title,
        thumbnail: {
          src: image.thumbnail?.src,
          originalSrc: image.thumbnail?.original,
          srcHeight: image.thumbnail?.height,
          srcWidth: image.thumbnail?.width,
        },
        meta_url: {
          favicon: image.meta_url?.favicon,
          hostname: image.meta_url?.hostname,
          domain: image.meta_url?.domain,
          breadcrumb: image.meta_url?.path,
        },
        url: image.url,
      }));
  }
  return output;
};

export const mapBraveMcp = (
  output: any,
  toolName?: string,
  part?: ToolUIPart
) => {
  switch (toolName) {
    case "webSearch":
      if (output.contentType === "application/json" && output.data) {
        return {
          webSearch: mapBraveWebSearch(output.data, part),
        };
      }
    case "imageSearch":
      if (output.contentType === "application/json" && output.data) {
        return {
          imageSearch: mapBraveImageSearch(output.data, part),
        };
      }
    default:
      return {};
  }
};
