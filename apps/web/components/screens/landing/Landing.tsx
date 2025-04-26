"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Landing = () => {
  const { user, initializingUser } = useAuth();
  const router = useRouter();

  const handleButtonClick = () => {
    if (user && (user as any)?.isOnboarded) {
      router.push("/dashboard");
    } else if (user && !(user as any)?.isOnboarded) {
      router.push("/onboarding");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to MicroFox
        </h1>
        <p className="text-lg text-muted-foreground">
          Your all-in-one platform for managing your projects
        </p>
        {initializingUser ? (
          <Skeleton className="h-12 w-32 mx-auto" />
        ) : (
          <Button
            size="lg"
            onClick={handleButtonClick}
            className="px-8 py-6 text-lg"
          >
            {user ? "Enter App" : "Login"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Landing;
