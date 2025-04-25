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
import { User as PrismaUser } from "@prisma/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { PortalSdk } from "@/utils/services/PortalSdk";

type AuthContextType = ReturnType<typeof useAuthInit>;

type DbUser = PrismaUser &
  Pick<SupabaseUser, "app_metadata" | "user_metadata" | "aud" | "created_at">;

const AuthContext = createContext<AuthContextType | null>(null);

const useAuthInit = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [logoutStatus, setLogoutStatus] = useState<{
    isLoggingOut: boolean;
    error: string | null;
  }>({
    isLoggingOut: false,
    error: null,
  });
  const [loginState, setLoginState] = useState<{
    loginType: "google" | "discord";
    isLoading: boolean;
    error: string | null;
    initializingUser: boolean;
  }>({
    loginType: "google",
    isLoading: false,
    error: null,
    initializingUser: false,
  });
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const handleSigninWithGoogle = useCallback(async () => {
    try {
      setLoginState((prev) => ({
        ...prev,
        loginType: "google",
        isLoading: true,
        error: null,
      }));

      const result = await signInWithGoogle({
        redirectTo: searchParams.get("redirect_to") ?? "",
      });
      if (result.url) {
        router.push(result.url);
      } else {
        throw new Error(
          result.error || "Login failed with No URL to redirect to"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login with Google");
      setLoginState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [router, searchParams]);

  const handleLogout = useCallback(async () => {
    try {
      setLogoutStatus({
        isLoggingOut: true,
        error: null,
      });
      const result = await signOut();
      if (result.success) {
        localStorage.removeItem("microfox_app_user");
        setUser(null);
        setDbUser(null);
        analytics.track("user_logout", {
          timestamp: new Date().toISOString(),
        });
        setLogoutStatus((prev) => ({
          ...prev,
          isLoggingOut: false,
        }));
        // router.refresh()
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
      setLogoutStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    } finally {
      setLogoutStatus((prev) => ({
        ...prev,
        isLoggingOut: false,
      }));
    }
  }, []);

  useEffect(() => {
    setLoginState((prev) => ({
      ...prev,
      initializingUser: true,
    }));

    analytics.init({
      mixpanelToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      debug: true,
    });

    // load db user
    const loadDbUser = async (email: string) => {
      if (!email || email.trim() === "") return false;
      try {
        const userString = localStorage.getItem("microfox_app_user");
        const user = userString ? JSON.parse(userString) : null;
        if (user && user.email === email) {
          setDbUser(user);
          return true;
        } else {
          const data = await PortalSdk.getData(`/api/users?email=${email}`, {});
          if (!data.email) return false;
          setDbUser(data);
          return true;
        }
      } catch (error) {
        console.error("Error loading db user:", error);
        return false;
      }
    };

    // Track auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      const dbUserLoaded = await loadDbUser(session?.user?.email ?? "");
      setLoginState((prev) => ({
        ...prev,
        loginType: (session?.user?.app_metadata?.provider as any) ?? "google",
        isLoading: false,
        initializingUser: false,
        error: null,
      }));
      // Track auth state changes
      if (event === "SIGNED_IN") {
        analytics.track("user_login", {
          provider: session?.user?.app_metadata?.provider ?? "google",
          timestamp: new Date().toISOString(),
        });
      } else if (event === "SIGNED_OUT") {
        analytics.track("user_logout", {
          timestamp: new Date().toISOString(),
        });
      }
    });
    // Initial session check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user ?? null);
      if (user) {
        const dbUserLoaded = await loadDbUser(user?.email ?? "");
        setLoginState((prev) => ({
          ...prev,
          initializingUser: false,
        }));
      } else {
        setLoginState((prev) => ({
          ...prev,
          initializingUser: false,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to identify user in analytics only if user data has changed
  const identifyAndStoreUser = (_user: DbUser) => {
    const previousUserString = localStorage.getItem("ai-douse_app_user");
    const previousUser = previousUserString
      ? JSON.parse(previousUserString)
      : null;
    const shouldIdentify =
      !previousUser || previousUserString !== JSON.stringify(_user);

    if (shouldIdentify) {
      console.log("Identifying user in analytics", _user);
      analytics.identify(_user.id, {
        email: _user.email,
        name: _user.name,
        avatar: _user.avatar,
      });
      localStorage.setItem("ai-douse_app_user", JSON.stringify(_user));
    }
  };

  // Identify User in analytics & restore to db, only if user data has changed
  useEffect(() => {
    if (dbUser) {
      identifyAndStoreUser(dbUser);
    }
  }, [dbUser]);

  return {
    user: dbUser,
    authUser: user,
    initializingUser: loginState.initializingUser,
    isLoading: loginState.isLoading,
    error: loginState.error,
    handleSigninWithGoogle,
    handleLogout,
    loginState,
    logoutStatus,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthInit();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
