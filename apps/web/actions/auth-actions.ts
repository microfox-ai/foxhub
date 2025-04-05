"use server";

import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { createClient } from "@/utils/supabase/server-client";
import { redirect } from "next/navigation";

export async function signInWithGoogle({ redirectTo }: { redirectTo: string }) {
  try {
    const supabase = await createClient();
    console.log("Initiating Google OAuth sign-in...");
    console.log(
      "Redirect URL:",
      `${APP_BASE_URL}/auth/callback?redirect_to=${redirectTo}`
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo
          ? `${APP_BASE_URL}/auth/callback?redirect_to=${redirectTo}`
          : `${APP_BASE_URL}/auth/callback`,
        scopes: "email profile",
      },
    });

    if (error) {
      console.error("OAuth error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return { error: error.message };
    }

    if (!data.url) {
      console.error("No URL returned from OAuth provider");
      return { error: "Authentication URL not received" };
    }

    return { url: data.url };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return { error: "An unexpected error occurred" };
  }
}
