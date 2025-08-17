"use client";

import Script from "next/script";

declare global {
  interface Window {
    FB: any;
  }
}

export function FacebookSDK() {
  return (
    <Script
      id="fb-sdk"
      src="https://connect.facebook.net/en_US/sdk.js"
      strategy="lazyOnload"
      onLoad={() => {
        if (window?.FB) {
          window?.FB?.init({
            appId: "2061594424315808",
            xfbml: true,
            version: "v23.0",
          });
          window?.FB?.AppEvents?.logPageView();
        }
      }}
    />
  );
}
