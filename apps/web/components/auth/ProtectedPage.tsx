import { createClient } from "@/utils/supabase/server-client";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";

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

  return <>{children}</>;
}
