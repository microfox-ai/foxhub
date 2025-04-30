import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { APP_BASE_URL, PUBLIC_ROUTES } from "../constants/appInfo";

export const updateSession = async (request: NextRequest) => {
  if (
    request.nextUrl.pathname.startsWith("/api/client-secrets/get-variables") ||
    request.nextUrl.pathname.startsWith("/api/webhooks")
  ) {
    return NextResponse.next();
  }
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Get current user and session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Skip auth check for public routes
    const isPublicRoute = PUBLIC_ROUTES.includes(request.nextUrl.pathname);

    if (isPublicRoute) {
      return NextResponse.next();
    }

    if (request.nextUrl.pathname.startsWith("/api")) {
      console.log(request.nextUrl);
      console.log(JSON.stringify(request.headers));
      console.log(
        "middleware api",
        request.headers.get("microfox-api-key"),
        process.env.MICROFOX_API_KEY
      );
      const inputAPiKey = request.headers.get("microfox-api-key");
      const serverApiKey = process.env.MICROFOX_API_KEY;
      if (inputAPiKey === serverApiKey) {
        return NextResponse.next();
      }
      if (user) {
        return NextResponse.next();
      }
      return NextResponse.json(
        { error: "Invalid API key or User Not authenticated" },
        { status: 401 }
      );
    }

    // If there's no user or an error, redirect to login
    if ((!user || userError) && !request.nextUrl.pathname.startsWith("/api")) {
      console.log("redirecting to", request.nextUrl.pathname);
      const redirectTo = `${APP_BASE_URL}${request.nextUrl.pathname}`;
      console.log("redirectTo", redirectTo);
      const redirectUrl = new URL("/login", APP_BASE_URL);
      redirectUrl.searchParams.set("redirect_to", redirectTo);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
};
