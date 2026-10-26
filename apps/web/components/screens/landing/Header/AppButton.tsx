"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const useAppButton = () => {
  const { user, initializingUser, authUser } = useAuth();
  const router = useRouter();

  const handleButtonClick = () => {
    if (user || authUser) {
      router.push("/dashboard");
    }
    // else if (user && !(user as any)?.isOnboarded) {
    //   router.push("/onboarding");
    // } 
    else {
      router.push("/login");
    }
  };

  return { handleButtonClick };
};

export const AppButton = () => {
  const { user, initializingUser, authUser } = useAuth();
  const router = useRouter();

  const handleButtonClick = () => {
    if (user || authUser) {
      router.push("/dashboard");
    }
    // else if (user && !(user as any)?.isOnboarded) {
    //   router.push("/dashboard");
    // }
    else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      {initializingUser ? (
        <Skeleton className="h-12 w-32 mx-auto" />
      ) : (
        <Button
          size="lg"
          onClick={handleButtonClick}
          className="px-8 py-6 text-lg"
        >
          {user ? "Console" : "Login"}
        </Button>
      )}
    </>
  );
};
