"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/browser-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signOut } from "@/actions/auth-actions";
import { analytics } from "@/utils/services/analytics/client";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  handleSigninWithGoogle: () => Promise<void>;
  handleLogout: () => Promise<void>;
  loggingOut: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const pathname = useSearchParams();

  const handleSigninWithGoogle = useCallback(async () => {
    try {
      // Track the attempt to sign in
      analytics.track("Login Attempt", { provider: "google" });

      const result = await signInWithGoogle({
        redirectTo: pathname.get("redirect_to") ?? "",
      });

      if (result.url) {
        analytics.track("Login Success", {
          provider: "google",
          timestamp: new Date().toISOString(),
        });
        router.push(result.url);
      } else {
        analytics.track("Login Failed", {
          provider: "google",
          error: result.error,
          timestamp: new Date().toISOString(),
        });
        console.error("Login failed:", result.error);
      }
    } catch (error) {
      analytics.track("Login Error", {
        provider: "google",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      console.error("Login error:", error);
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      localStorage.removeItem("microfox_app_user");
      await signOut();
      setLoggingOut(false);
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  }, [router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isLoading,
    handleSigninWithGoogle,
    handleLogout,
    loggingOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
