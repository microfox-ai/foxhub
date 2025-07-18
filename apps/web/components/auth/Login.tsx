"use client";

/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "./AuthProvider";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { handleSigninWithGoogle, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden py-0">
        <CardContent className="grid p-0 md:grid-cols-2 ">
          <div className="p-6 md:p-8 h-full flex flex-col justify-center items-center">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold py-4">
                Hello ! I&apos;m Microfox
              </h1>
              <p className="text-balance text-md text-muted-foreground">
                I can help you access, research & operate digital tools in your stead. Fire the micro-tasks on me, & I will not let you down.
              </p>
            </div>
            <Button
              variant="outline"
              className=" my-8"
              onClick={(e) => {
                e.preventDefault();
                handleSigninWithGoogle();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4"
              >
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
          <div className="relative hidden bg-muted md:block min-h-[500px]">
            <img
              src="/images/fox.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        We are currently in beta, so please expect some minor-bugs and issues.
        {/* By clicking continue, you agree to our <Link href={APP_ROUTES.termsOfService}>Terms of Service</Link>{" "}
        and <Link href={APP_ROUTES.privacyPolicy}>Privacy Policy</Link>. */}
      </div>
    </div>
  );
}
