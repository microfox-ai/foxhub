"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { User } from "@prisma/client";
import { useState, useEffect } from "react";

export function useUser() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      if (!authUser) {
        setDbUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const localUser = localStorage.getItem("app_user");
        if (localUser) {
          setDbUser(JSON.parse(localUser));
          setIsLoading(false);
        } else {
          const response = await fetch(`/api/users?email=${authUser.email}`);
          if (!response.ok) {
            throw new Error("Failed to fetch user data");
          }
          const user = await response.json();
          setDbUser(user);
          localStorage.setItem("app_user", JSON.stringify(user));
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

  return { user: dbUser, isLoading, error };
}
