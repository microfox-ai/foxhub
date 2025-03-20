"use server";

import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { createClient } from "@/utils/supabase/server-client";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${APP_BASE_URL}/auth/callback`,
        scopes: "email profile",
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { url: data.url };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "An unexpected error occurred" };
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
