"use client"

import type React from "react"

/**
 * AwsProvider is now mounted once in the console route layout so its log/analytics
 * cache survives tab and project navigation. This wrapper is kept as a passthrough
 * for back-compat with existing call sites.
 */
export function AwsSectionWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
