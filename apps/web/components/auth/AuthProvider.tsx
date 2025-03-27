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
      const result = await signInWithGoogle();

      if (result.url) {
        router.push(result.url);
      } else {
        console.error("Login failed:", result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      const result = await signOut();

      if (result.success) {
        router.refresh();
        localStorage.removeItem("app_user");
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
