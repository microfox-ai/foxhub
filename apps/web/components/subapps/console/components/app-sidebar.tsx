"use client"

import type React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { Home, Rocket, Plus, PanelLeft, ChevronsUpDown } from "lucide-react"
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
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { useConsole } from "@/components/subapps/console/context/console-context"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Bot, KeyRound, FileText } from "lucide-react"

function CreateOrganizationDialog({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children?: React.ReactNode }) {
    const { createOrganization } = useConsole()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <Button
                        onClick={async () => {
                            await createOrganization({ name, description })
                            onOpenChange(false)
                        }}
                    >
                        Create
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CreateProjectDialog({ children }: { children: React.ReactNode }) {
    const { createProject } = useConsole()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button
                        onClick={async () => {
                            await createProject({ name })
                            setOpen(false)
                        }}
                    >
                        Create
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { state, selectProject, selectOrganization, createOrganization, createProject } = useConsole()
  const activeProjectId = state.selectedProjectId
  const onGo = (href: string) => router.push(href)

  const [isCreateOrgOpen, setCreateOrgOpen] = useState(false)

  const organizationId = params.organizationId as string;

  const selectedOrganization = state.organizations.find(o => o._id === organizationId);

  const navItems = [
    { label: "Home", icon: Home, href: "/subdomain/console" },
  ]

  const consoleNavItems = [
    { label: "My Bots", icon: Bot, href: `/my-bots` },
    { label: "Connections", icon: KeyRound, href: `/my-data` },
    { label: "Secret Templates", icon: FileText, href: `/template` },
  ]

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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Console</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {consoleNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {state.projects.map((p) => {
                const isActive = pathname?.endsWith(`/${p._id}`) || p._id === activeProjectId
                return (
                  <SidebarMenuItem key={p._id}>
                    <SidebarMenuButton
                      tooltip={p.name}
                      isActive={!!isActive}
                      onClick={() => {
                        selectProject(p._id)
                        onGo(`/subdomain/console/${organizationId}/${p._id}`)
                      }}
                    >
                      <Rocket />
                      <span>{p.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
           <CreateProjectDialog>
            <Button variant="ghost" className="w-full justify-start mt-2">
                    <Plus className="mr-2 size-4" />
                    Create Project
                </Button>
           </CreateProjectDialog>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent justify-between">
                <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                        <AvatarImage src={selectedOrganization?.avatar} />
                        <AvatarFallback>{selectedOrganization?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {selectedOrganization?.name || "Select Organization"}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search organization..." />
              <CommandList>
                <CommandEmpty>No organization found.</CommandEmpty>
                <CommandGroup>
                    {state.organizations.map((org) => (
                    <CommandItem
                        key={org._id}
                        onSelect={() => {
                            selectOrganization(org._id)
                            onGo(`/subdomain/console/${org._id}`)
                        }}
                        className="flex items-center gap-2"
                    >
                        <Avatar className="w-6 h-6">
                            <AvatarImage src={org.avatar} />
                            <AvatarFallback>{org.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {org.name}
                    </CommandItem>
                    ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                    <CommandItem onSelect={() => setCreateOrgOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Create Organization
                    </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <CreateOrganizationDialog open={isCreateOrgOpen} onOpenChange={setCreateOrgOpen} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function Shell({ children }: { children?: React.ReactNode }) {
    const params = useParams()
    const { state } = useConsole();
    const organizationId = params.organizationId as string;
    const projectId = params.projectId as string;

    const organization = state.organizations.find(o => o._id === organizationId);
    const project = state.projects.find(p => p._id === projectId);


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
                {organization && <BreadcrumbSeparator />}
                {organization && (
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/subdomain/console/${organization?._id}`}>{organization?.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                {project && <BreadcrumbSeparator />}
                {project && (
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/subdomain/console/${organization?._id}/${project?._id}`}>{project?.name}</BreadcrumbLink>
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
