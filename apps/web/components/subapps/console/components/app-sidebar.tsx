"use client"

import type React from "react"
import { useRouter, usePathname, useParams, useSearchParams } from "next/navigation"
import {
  Home,
  Rocket,
  SquareTerminal,
  LayoutDashboard,
  Activity,
  KeyRound,
  Users,
  Settings,
  ChevronLeft,
  Zap,
  History,
  DollarSign,
} from "lucide-react"
import type { Permission } from "@/server/types"
import { usePermissions } from "@/components/subapps/console/lib/use-permissions"
import {
  Sidebar,
  SidebarContent,
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
import { cn } from "@/lib/utils"

type NavItem = {
  tab: string
  label: string
  icon: typeof LayoutDashboard
  /** Permission required to see this section; omitted = always visible. */
  perm?: Permission
}

/**
 * Sidebar nav, grouped for progressive disclosure. The "Monitoring" group bundles the run-facing
 * surfaces: "Infrastructure" = the read-only per-Lambda observability page (CloudWatch logs +
 * metrics for ALL deployed functions), "Run & test" = the interactive trigger catalog (trigger a
 * worker/queue and watch its run tree/outputs), History = past runs. The "Manage" group holds the
 * project-admin surfaces (env/members/config/settings).
 */
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { tab: "overview", label: "Overview", icon: LayoutDashboard },
      { tab: "deployments", label: "Deployments", icon: Rocket },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { tab: "infrastructure", label: "Infrastructure", icon: Activity, perm: "observability.view" },
      { tab: "run-test", label: "Run & test", icon: Zap, perm: "workers.view" },
      { tab: "history", label: "History", icon: History, perm: "workers.view" },
      { tab: "usage", label: "Usage & cost", icon: DollarSign, perm: "observability.view" },
    ],
  },
  {
    label: "Manage",
    items: [
      { tab: "environment", label: "Environment", icon: KeyRound, perm: "env.view" },
      { tab: "members", label: "Members", icon: Users, perm: "members.view" },
      { tab: "settings", label: "Settings", icon: Settings },
    ],
  },
]

const ALL_TABS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.tab))

/** Maps legacy `tab=` values (from before the Infrastructure/Run & test rename) to current ones. */
function resolveTab(raw: string | null): string {
  if (raw === "analytics" || raw === "logs" || raw === "observability") return "infrastructure"
  if (raw === "workers") return "run-test"
  return ALL_TABS.includes(raw as string) ? (raw as string) : "overview"
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

  // Gate sections by permission. While still loading, show everything (don't hide the
  // owner's own tabs); once resolved, drop sections a restricted member can't access.
  const { can, ready } = usePermissions(projectId)
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((s) => !s.perm || !ready || can(s.perm)),
  })).filter((g) => g.items.length > 0)

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="size-6 shrink-0 rounded bg-foreground/10 grid place-items-center">
            <SquareTerminal className="size-4" />
          </div>
          <span className="text-sm font-semibold truncate group-data-[collapsible=icon]:hidden">
            Console
          </span>
        </div>
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        {projectId ? (
          visibleGroups.map((group, gi) => (
            <SidebarGroup key={group.label ?? `group-${gi}`}>
              <SidebarGroupLabel className="truncate">
                {gi === 0
                  ? state.currentProject?.displayName ?? "Project"
                  : group.label ?? ""}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((s) => (
                    <SidebarMenuItem key={s.tab}>
                      <SidebarMenuButton
                        tooltip={s.label}
                        isActive={activeTab === s.tab}
                        onClick={() =>
                          router.push(
                            `/dashboard/${organizationId}/${projectId}?tab=${s.tab}`,
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
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/dashboard"}
                    onClick={() => router.push("/dashboard")}
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
                      router.push(`/dashboard/${organizationId}`)
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
            <SidebarTrigger className="shrink-0" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Console</BreadcrumbLink>
                </BreadcrumbItem>
                {organizationId && <BreadcrumbSeparator />}
                {organizationId && (
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbLink
                      href={`/dashboard/${organizationId}`}
                      className="truncate max-w-[10rem]"
                    >
                      {orgName ?? "Organization"}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                {projectId && <BreadcrumbSeparator />}
                {projectId && (
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbLink
                      href={`/dashboard/${organizationId}/${projectId}`}
                      className="truncate max-w-[12rem]"
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
