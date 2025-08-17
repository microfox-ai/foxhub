"use client"

import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Shell } from "./app-sidebar"

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  )
}
