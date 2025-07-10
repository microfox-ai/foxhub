import { ToolUIPart } from "ai";
import { BraveMcp, BraveWebSearchOutput } from "./types";

const mapBraveWebSearch = (data: any, part?: ToolUIPart) => {
  let output: BraveWebSearchOutput = {
    video_sources: [],
    web_sources: [],
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
          breadcrumb: video.meta_url?.breadcrumb,
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
          breadcrumb: web.meta_url?.breadcrumb,
        },
        url: web.url,
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
    default:
      return output;
  }
};
