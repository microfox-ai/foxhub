import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { chain } from "./utils/middleware/chain";
import { subdomainRerouting } from "./utils/middleware/subdomain";
import { mainMiddleware } from "./utils/middleware/main";

export const middleware = chain([mainMiddleware, subdomainRerouting]);

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
    "/((?!_next/static|_next/image|favicon.ico|widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
