"use client"

import type React from "react"
import { useParams } from "next/navigation"
import { ConsoleProvider } from "@/components/subapps/console/context/console-context"
import { AwsProvider } from "@/components/subapps/console/context/aws-context"
import ConsoleLayout from "@/components/subapps/console/components/console-layout"
import { useAuth } from "@/components/auth/AuthProvider"

/**
 * Shared layout for the entire console route. Mounting the providers here (instead
 * of inside each page) means navigating org -> project -> back keeps the SWR cache,
 * selection, and log state alive — no full refetch/remount on every navigation.
 */
export default function ConsoleRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const params = useParams()
  const organizationId = params?.organizationId as string | undefined
  const projectId = params?.projectId as string | undefined

  return (
    <ConsoleProvider
      userId={user?.id ?? ""}
      organizationId={organizationId}
      projectId={projectId}
    >
      <AwsProvider>
        <ConsoleLayout>{children}</ConsoleLayout>
      </AwsProvider>
    </ConsoleProvider>
  )
}
