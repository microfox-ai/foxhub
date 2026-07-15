"use client"

import { Layers } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConsole } from "@/components/subapps/console/context/console-context"

/** Human label for a stage slot. */
export function stageLabel(stage: string): string {
  switch (stage) {
    case "prod":
      return "Production"
    case "staging":
      return "Staging"
    case "dev":
      return "Development"
    default:
      return stage
  }
}

/**
 * Project-scoped stage switcher. Renders only when the project has more than one stage
 * (a project that never deployed a non-prod stage sees no selector — zero new UI). All
 * stage-scoped views (deploy target, env, monitoring) read `state.selectedStage`.
 */
export function StageSelector({ className }: { className?: string }) {
  const { state, setSelectedStage } = useConsole()
  const stages = state.availableStages
  if (!stages || stages.length <= 1) return null

  return (
    <Select value={state.selectedStage} onValueChange={setSelectedStage}>
      <SelectTrigger size="sm" className={className} aria-label="Deployment stage">
        <Layers className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stages.map((s) => (
          <SelectItem key={s} value={s}>
            {stageLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
