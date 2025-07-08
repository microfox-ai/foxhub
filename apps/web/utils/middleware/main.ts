import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "../supabase/middleware";
import { ROOT_DOMAIN } from "../constants/appInfo";

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
    subdomain: hostname?.match(/^([^.]+)\./)?.[1],
    url: url,
  };
};

export const mainMiddleware = async (
  request: NextRequest,
  next: () => Promise<NextResponse>
) => {
  if (
    request.nextUrl.pathname.startsWith("/policies/") ||
    request.nextUrl.pathname.startsWith("/blog") ||
    request.nextUrl.pathname.startsWith("/api/subdomain-redirect")
  ) {
    return NextResponse.next();
  }

  const { subdomain } = await fetchSubdomain(request);

  // bypass for all subdomain with length > 3 routes i.e public hosted pages or subdomain hosted pages.
  if (subdomain && subdomain.length > 3) {
    console.log("bypassing for subdomain", subdomain);
    return next();
  }

  if (
    request.nextUrl.href.match(
      /((?!_next\/static|_next\/image|favicon\.ico|widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)/
    )
  ) {
    return NextResponse.next();
  }

  return updateSession(request);
};
