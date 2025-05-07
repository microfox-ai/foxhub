import { createClient } from "@/utils/supabase/server-client";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

export default async function ProtectedPage({
  children,
}: React.PropsWithChildren) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Check if user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) {
    return redirect("/login");
  }


  const isProduction = APP_BASE_URL === "https://microfox.app";

  if (isProduction) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h4>
          This feature is only available in staging.microfox.app for now.
        </h4>
      </div>
    )
  }

  if (!dbUser.isBetaAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h4>
          This feature is only available for whitelisted users. Please request
          access over here.
        </h4>
      </div>
    );
  }

  return <>{children}</>;
}
