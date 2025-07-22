import { UiCommonTypes } from "@microfox/types";
import { components, paths } from "../sparkboard";

export const mapSearchResults = (
  data: paths["/search/images"]["get"]["responses"]["200"]["content"]["application/json"]["data"]
): UiCommonTypes["ImageSet"][] => {
  if (!data?.results) {
    return [];
  }
  return data?.results?.map((result) => {
    const lastImage =
      result.metadata?.responsiveImages?.[
        result.metadata?.responsiveImages?.length - 1
      ];
    return {
      src: result.metadata?.src ?? "",
      srcWidth: result.metadata?.width ?? 0,
      srcHeight: result.metadata?.height ?? 0,
      title: result.metadata?.altText ?? "",
      description: result.metadata?.description ?? "",
      imagePageUrl: result.metadata?.imgPermalink ?? "",
      pageUrl: result.metadata?.pagePermalink ?? "",
      originalSrc: lastImage?.url ?? result.metadata?.src ?? "",
      set: result.metadata?.responsiveImages?.map((image) => {
        return {
          src: image.url,
          size: image.size,
        };
      }) as UiCommonTypes["ImageSet"]["set"],
      metadata: {
        palette: result.metadata?.palette ?? [],
        dominantColor: result.metadata?.dominantColor ?? "",
        secondaryColor: result.metadata?.secondaryColor ?? "",
        accentColor: result.metadata?.accentColor ?? "",
        aspectRatio: result.metadata?.aspectRatio ?? 0,
        aspectRatioType: result.metadata?.aspectRatioType ?? "",
        mediaType: result.metadata?.mediaType ?? "",
        mimeType: result.metadata?.mimeType ?? "",
        platform: result.metadata?.platform ?? "",
        platformId: result.metadata?.platformId ?? "",
        platformUrl: result.metadata?.platformUrl ?? "",
        keywords: result.metadata?.keywords ?? [],
        audienceKeywords: result.metadata?.audienceKeywords ?? [],
        artStyle: result.metadata?.artStyle ?? [],
      } as UiCommonTypes["ImageSet"]["metadata"],
    } as UiCommonTypes["ImageSet"];
  });
};
