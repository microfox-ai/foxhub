const getMediaQuery = (maxWidth: number) => {
  return `@media (max-width: ${maxWidth}px)`;
};

const getGreaterMediaQuery = (maxWidth: number) => {
  return `@media (min-width: ${maxWidth}px)`;
};

export const breakpoints = {
  largeMobile: 480,
  tablet: 768,
  laptop: 1024,
  largeLaptop: 1280,
};

const media = {
  custom: getMediaQuery,
  default: getGreaterMediaQuery(breakpoints.largeLaptop),
  largeMobile: getMediaQuery(breakpoints.largeMobile),
  tablet: getMediaQuery(breakpoints.tablet),
  laptop: getMediaQuery(breakpoints.laptop),
  largeLaptop: getMediaQuery(breakpoints.largeLaptop),
  moreTablet: getGreaterMediaQuery(breakpoints.tablet),
};

export const reverseMedia = {
  custom: getGreaterMediaQuery,
  largeMobile: getGreaterMediaQuery(breakpoints.largeMobile),
  tablet: getGreaterMediaQuery(breakpoints.tablet),
  laptop: getGreaterMediaQuery(breakpoints.laptop),
  largeLaptop: getGreaterMediaQuery(breakpoints.largeLaptop),
};

export default media;
