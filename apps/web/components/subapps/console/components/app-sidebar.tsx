"use client"

import type React from "react"
import { useRouter, usePathname, useParams, useSearchParams } from "next/navigation"
import {
  Home,
  Rocket,
  PanelLeft,
  LayoutDashboard,
  Activity,
  FileCode,
  KeyRound,
  Settings,
  ChevronLeft,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { ConsoleBotSwitcher } from "./console-bot-switcher"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "deployments", label: "Deployments", icon: Rocket },
  { tab: "observability", label: "Observability", icon: Activity },
  { tab: "environment", label: "Environment", icon: KeyRound },
  { tab: "config", label: "Config", icon: FileCode },
  { tab: "settings", label: "Settings", icon: Settings },
] as const

function resolveTab(raw: string | null): string {
  if (raw === "analytics" || raw === "logs") return "observability"
  return SECTIONS.some((s) => s.tab === raw) ? (raw as string) : "overview"
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const { state } = useConsole()

  const organizationId = params?.organizationId as string | undefined
  const projectId = params?.projectId as string | undefined
  const activeTab = resolveTab(searchParams.get("tab"))

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="size-6 rounded bg-foreground/10 grid place-items-center">
            <PanelLeft className="size-4" />
          </div>
          <span className="text-sm font-semibold">Console</span>
        </div>
        <SidebarSeparator />
      </SidebarHeader>

      <SidebarContent>
        {projectId ? (
          <SidebarGroup>
            <SidebarGroupLabel className="truncate">
              {state.currentProject?.displayName ?? "Project"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECTIONS.map((s) => (
                  <SidebarMenuItem key={s.tab}>
                    <SidebarMenuButton
                      tooltip={s.label}
                      isActive={activeTab === s.tab}
                      onClick={() =>
                        router.push(
                          `/subdomain/console/${organizationId}/${projectId}?tab=${s.tab}`,
                          { scroll: false },
                        )
                      }
                    >
                      <s.icon />
                      <span>{s.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/subdomain/console"}
                    onClick={() => router.push("/subdomain/console")}
                  >
                    <Home />
                    <span>Organizations</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {projectId && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Back to projects"
                    onClick={() =>
                      router.push(`/subdomain/console/${organizationId}`)
                    }
                  >
                    <ChevronLeft />
                    <span>All projects</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <ConsoleBotSwitcher />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function Shell({ children }: { children?: React.ReactNode }) {
  const params = useParams()
  const { state } = useConsole()
  const organizationId = params?.organizationId as string | undefined
  const projectId = params?.projectId as string | undefined

  const orgName = state.currentOrganization?.name
  const projectName = state.currentProject?.displayName

  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar />
      <main className={cn("flex-1 min-w-0")}>
        <div className="sticky top-0 z-10 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
          <div className="flex items-center gap-2 p-2">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/subdomain/console">Console</BreadcrumbLink>
                </BreadcrumbItem>
                {organizationId && <BreadcrumbSeparator />}
                {organizationId && (
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/subdomain/console/${organizationId}`}>
                      {orgName ?? "Organization"}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                {projectId && <BreadcrumbSeparator />}
                {projectId && (
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={`/subdomain/console/${organizationId}/${projectId}`}
                    >
                      {projectName ?? "Project"}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
