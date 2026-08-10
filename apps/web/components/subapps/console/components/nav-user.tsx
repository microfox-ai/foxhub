"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  Bot,
  ChevronsUpDown,
  KeyRound,
  LayoutGrid,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import LogoutConfirmationDialog from "@/components/auth/LogoutConfirmationDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

/** "Vishwajeet Yadav" -> "VY"; falls back to the email's first letter. */
function initialsOf(name?: string | null, email?: string | null) {
  const source = (name ?? "").trim() || (email ?? "").trim()
  if (!source) return "?"
  const parts = source.split(/[\s._@-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return `${first}${last}`.toUpperCase()
}

/**
 * Account switcher in the sidebar footer — the console's counterpart to the floating
 * `LogoutElement` the main app renders on every page. Shows who's signed in and holds
 * the profile/cross-app links plus logout, so the console reads like the main dashboard
 * instead of a bare nav rail.
 */
export function NavUser({ projectHref }: { projectHref?: string }) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { user, initializingUser, handleLogout, logoutStatus } = useAuth()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const handleConfirmLogout = async () => {
    try {
      await handleLogout()
      setShowLogoutDialog(false)
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (initializingUser && !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const name = user?.name ?? "Account"
  const email = user?.email ?? ""
  const avatar = user?.avatar ?? undefined

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={name}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  {avatar && <AvatarImage src={avatar} alt={name} />}
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {initialsOf(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback className="rounded-lg text-xs font-medium">
                      {initialsOf(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              {(user?.isBetaAccess || user?.isAdmin) && (
                <>
                  <DropdownMenuSeparator />
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {user?.isBetaAccess && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Sparkles className="size-3" />
                        Beta access
                      </Badge>
                    )}
                    {user?.isAdmin && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <BadgeCheck className="size-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutGrid />
                  Organizations
                </DropdownMenuItem>
                {projectHref && (
                  <DropdownMenuItem onClick={() => router.push(projectHref)}>
                    <Settings />
                    Project settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push("/my-data")}>
                  <KeyRound />
                  Connections
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/my-bots")}>
                  <Bot />
                  My Bots
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowLogoutDialog(true)}
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <LogoutConfirmationDialog
        showLogoutDialog={showLogoutDialog}
        setShowLogoutDialog={setShowLogoutDialog}
        handleConfirmLogout={handleConfirmLogout}
        loggingOut={logoutStatus.isLoggingOut}
      />
    </>
  )
}
