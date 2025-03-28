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
import { useRouter } from "next/navigation";
import { signInWithGoogle, signOut } from "@/actions/auth-actions";
import { analytics } from "@/utils/services/analytics/client";

interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  handleSigninWithGoogle: () => Promise<void>;
  handleLogout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const handleSigninWithGoogle = useCallback(async () => {
    try {
      // Track the attempt to sign in
      analytics.track("Login Attempt", { provider: "google" });

      const result = await signInWithGoogle();

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
      const result = await signOut();

      if (result.success) {
        localStorage.removeItem("app_user");
        router.refresh();
      } else {
        console.error("Logout failed:", result.error);
      }
    } catch (error) {
      console.error("Logout error:", error);
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
