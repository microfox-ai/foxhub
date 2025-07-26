import {
  APP_BASE_URL,
  APP_DOMAIN,
  ROOT_DOMAIN,
} from "@/utils/constants/appInfo";
import { updateSession } from "@/utils/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  SUPPORTED_SUBDOMAINS,
  SUPPORTED_VERCEL_SUBDOMAINS,
} from "../constants/subdomains";

const fetchSubdomain = async (request: NextRequest) => {
  const url = request.nextUrl;
  let hostname = request.headers
    .get("host")!
    .replace(".localhost:3000", `.${ROOT_DOMAIN}`);
  // special case for Vercel preview deployment URLs
  if (
    hostname.includes("---") &&
    hostname.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    hostname = `${hostname.split("---")[0]}.${ROOT_DOMAIN}`;
  }
  return {
    hostname,
    subdomain:
      hostname.split(".").length > 2 ||
      (ROOT_DOMAIN === "localhost:3000" && hostname.split(".").length > 1)
        ? hostname?.match(/^([^.]+)\./)?.[1]
        : null,
    url: url,
  };
};

export async function subdomainRerouting(
  request: NextRequest,
  next: () => Promise<NextResponse>
) {
  // Skip middleware for WebSocket connections

  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/subscribe/")
  ) {
    return next();
    // console.log('api request', request.nextUrl.href)
    // return updateSession(request)
  }

  try {
    const { url, hostname, subdomain } = await fetchSubdomain(request);
    const searchParams = request.nextUrl.searchParams.toString();
    // Get the pathname of the request (e.g. /, /about, /blog/first-post)
    const path = `${url.pathname}${
      searchParams.length > 0 ? `?${searchParams}` : ""
    }`;
    console.log("req-data:", subdomain, hostname, request.nextUrl);

    // hitting from www., or ., or anything inside the main app or editor app.
    if (
      !subdomain ||
      subdomain.length <= 3 || // www. or axy.
      hostname === APP_DOMAIN || // aidouse.com
      subdomain === APP_DOMAIN ||
      subdomain === "staging"
      //hostname.includes('vercel.app') ||
      //path.includes('/api/')
    ) {
      // if (request.nextUrl.pathname.startsWith("/sites")) {
      //   return updateSession(request);
      // } else if (path === "/") {
      //   return NextResponse.redirect(`${APP_BASE_URL}/home`);
      // }
      return updateSession(request);
      //return next();
    }

    /// ---- SUBDOMAIN ROUTING ---- ///

    if (subdomain) {
      if (SUPPORTED_SUBDOMAINS.includes(subdomain)) {
        //bypass rewriting for static assets
        if (
          path.startsWith("/_next") ||
          path.startsWith("/api") ||
          path.startsWith("/favicon.ico") ||
          path.startsWith("/subdomain") ||
          path.includes("widget") ||
          /\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$/.test(path)
        ) {
          return NextResponse.next();
        }

        console.log(
          "rewriting to:",
          new URL(
            `https://${APP_DOMAIN}${path.startsWith("/subdomain/" + subdomain) ? path : `/subdomain/${subdomain}${path}`}`,
            request.url
          ).toJSON()
        );
        return NextResponse.rewrite(
          new URL(
            `https://${APP_DOMAIN}${path.startsWith("/subdomain/" + subdomain) ? path : `/subdomain/${subdomain}${path}`}`,
            request.url
          )
        );
      }

      if (Object.keys(SUPPORTED_VERCEL_SUBDOMAINS).includes(subdomain)) {
        console.log(
          "rewriting to:",
          `https://${SUPPORTED_VERCEL_SUBDOMAINS[subdomain as keyof typeof SUPPORTED_VERCEL_SUBDOMAINS]}.vercel.app`
        );
        return NextResponse.rewrite(
          new URL(
            `https://${SUPPORTED_VERCEL_SUBDOMAINS[subdomain as keyof typeof SUPPORTED_VERCEL_SUBDOMAINS]}.vercel.app${path}`,
            request.url
          )
        );
      }

      // try {
      //   const response = await fetch(
      //     `${APP_BASE_URL}/api/subdomain-redirect/${subdomain}`
      //   );
      //   if (response.ok) {
      //     const { redirect } = await response.json();
      //     if (redirect) {
      //       const destination = `${redirect.rewritePath}${path}`;
      //       console.log("Dynamically rerouting to:", destination);

      //       if (redirect.rewriteType === "REWRITE") {
      //         if (redirect.hostedOn === "VERCEL") {
      //           return NextResponse.rewrite(
      //             new URL(destination, `https://${redirect.rewritePath}`)
      //           );
      //         }
      //         return NextResponse.rewrite(new URL(destination, request.url));
      //       }

      //       if (redirect.rewriteType === "REDIRECT") {
      //         return NextResponse.redirect(new URL(destination, request.url));
      //       }
      //     }
      //   }
      // } catch (error) {
      //   console.error("Error fetching subdomain redirect:", error);
      // }
    }

    console.log(
      "checking subdomain:",
      subdomain,
      "against supported subdomains:",
      SUPPORTED_SUBDOMAINS,
      "and supported vercel subdomains:",
      SUPPORTED_VERCEL_SUBDOMAINS
    );

    return NextResponse.next();
  } catch (error) {
    console.log("rerouting middleware error", error);
    return next();
  }
}
