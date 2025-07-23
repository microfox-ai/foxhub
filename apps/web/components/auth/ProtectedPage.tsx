import { createClient } from "@/utils/supabase/server-client";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL, IN_DEV } from "@/utils/constants/appInfo";
import { WaitlistedInfo } from "./Waitlisted";
import { AccessCodeVerification } from "./AccessCodeVerification";

export default async function ProtectedPage({
  children,
}: React.PropsWithChildren) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const isProduction = APP_BASE_URL === "https://microfox.app";

  if (isProduction) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <WaitlistedInfo />
      </div>
    );
  }

  if (!dbUser.isBetaAccess && !IN_DEV) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <AccessCodeVerification />
      </div>
    );
  }

  return <>{children}</>;
}
