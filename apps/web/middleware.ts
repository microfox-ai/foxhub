import { NextResponse } from "next/server";
import { MiddlewareFunction, chain } from "./utils/middleware/chain";
import { mainMiddleware } from "./utils/middleware/main";
import { subdomainRerouting } from "./utils/middleware/subdomain";

const corsMiddleware: MiddlewareFunction = async (request, next) => {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    /^https:\/\/(.*\.)?microfox\.app$/,
    /^http:\/\/localhost(:\d+)?$/,
  ];

  let corsOrigin = "";
  if (
    origin &&
    allowedOrigins.some((pattern) => new RegExp(pattern).test(origin))
  ) {
    corsOrigin = origin;
  }

  const response =
    request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : await next();

  if (corsOrigin) {
    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  return response;
};

export const middleware = chain([
  corsMiddleware,
  mainMiddleware,
  subdomainRerouting,
]);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    //"//",
    //"/((?!_next/static|_next/image|favicon.ico|widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
    "/((?!widget).*)",
  ],
};
