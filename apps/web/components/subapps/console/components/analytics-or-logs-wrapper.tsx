"use client"

import type React from "react"

import { AwsProvider } from "@/components/subapps/console/context/aws-context"

export function AwsSectionWrapper({ children }: { children: React.ReactNode }) {
  return <AwsProvider>{children}</AwsProvider>
}
