"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { User } from "@prisma/client";
import { useState, useEffect } from "react";
import { analytics } from "@/utils/services/analytics/client";

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: any;
  handleSigninWithGoogle: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const { user: authUser, isLoading: isAuthLoading, ...auth } = useAuth();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to identify user in analytics only if user data has changed
  const identifyUser = (user: User) => {
    const previousUser = localStorage.getItem("microfox_app_user");
    const shouldIdentify =
      !previousUser ||
      JSON.parse(previousUser).id !== user.id ||
      JSON.parse(previousUser).email !== user.email ||
      JSON.parse(previousUser).name !== user.name ||
      JSON.parse(previousUser).avatar !== user.avatar;

    if (shouldIdentify) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      });
      localStorage.setItem("microfox_app_user", JSON.stringify(user));
    }
  };

  useEffect(() => {
    async function fetchUser() {
      if (!authUser) {
        setDbUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const localUser = localStorage.getItem("microfox_app_user");
        if (localUser) {
          const user = JSON.parse(localUser);
          setDbUser(user);
          identifyUser(user);
          setIsLoading(false);
        } else {
          const response = await fetch(`/api/users?email=${authUser.email}`);
          if (!response.ok) {
            throw new Error("Failed to fetch user data");
          }
          const user = await response.json();
          setDbUser(user);
          identifyUser(user);
          localStorage.setItem("microfox_app_user", JSON.stringify(user));
        }
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchUser();
    }
  }, [authUser, isAuthLoading]);

  return { user: dbUser, isLoading, error, ...auth };
}
