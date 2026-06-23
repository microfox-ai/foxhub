"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/components/auth/AuthProvider"

type BotProjectLite = {
  id: string
  name: string
  imageUrl?: string | null
  type?: string
}

const DEFAULT_AVATAR = "/images/default-bot-avatar.png"
const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Bot-project switcher for the console sidebar — mirrors the main Foxhub sidebar
 * switcher. Shows the user's CONSOLE-type bot ("Console Project") as the current
 * selection, lists all bots, and on select routes the console bot back to the
 * console and any other bot to the main app (`/project/{id}`). Writes the choice
 * to the same localStorage key the main app reads, so the two stay in sync.
 */
export function ConsoleBotSwitcher() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { data: consoleProject } = useSWR<BotProjectLite>(
    user?.id ? `/api/bot-project/console?userId=${user.id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )
  const { data: bots, isLoading } = useSWR<BotProjectLite[]>(
    user?.id ? `/api/bot-project?userId=${user.id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const onSelect = (bot: BotProjectLite) => {
    setOpen(false)
    try {
      window.localStorage.setItem("selectedProject", JSON.stringify(bot))
    } catch {
      /* ignore */
    }
    const isConsole = bot.type === "CONSOLE" || bot.id === consoleProject?.id
    router.push(isConsole ? "/subdomain/console" : `/project/${bot.id}`)
  }

  if (isLoading || !user) return <Skeleton className="h-9 w-full rounded-md" />

  const currentName = consoleProject?.name ?? "Console Project"
  const currentImage = consoleProject?.imageUrl ?? DEFAULT_AVATAR

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          <span className="flex min-w-0 items-center gap-2">
            <img src={currentImage} alt="" className="size-4 shrink-0 rounded object-cover" />
            <span className="truncate">{currentName}</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>{"No projects found."}</CommandEmpty>
            <CommandGroup>
              {(bots ?? []).map((b) => {
                const isCurrent = b.id === consoleProject?.id
                return (
                  <CommandItem
                    key={b.id}
                    value={b.name}
                    onSelect={() => onSelect(b)}
                    className="flex items-center gap-2"
                  >
                    <img
                      src={b.imageUrl ?? DEFAULT_AVATAR}
                      alt=""
                      className="size-4 shrink-0 rounded object-cover"
                    />
                    <span className="truncate">{b.name}</span>
                    {isCurrent ? <Check className="ml-auto size-4" /> : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => router.push("/new-project")}>
                <Plus className="mr-2 size-4" />
                {"New project"}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
