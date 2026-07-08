"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  consoleApi,
  type WorkerJobNode,
  type QueueCatalogStep,
} from "@/components/subapps/console/lib/console-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, X, UserCheck, Loader2 } from "lucide-react"

/**
 * Generic HITL reviewer panel for a queue step parked at `awaiting_approval`. Renders a form from
 * the step's HITL JSON schema (looked up in the worker catalog by queueId + definition step index)
 * and submits an approve/reject decision. Server-side validates + re-dispatches. Nothing here is
 * specific to any worker or queue — it's entirely schema-driven, with a raw-JSON fallback until the
 * schema is published (CLI redeploy).
 */

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  description?: string
  default?: unknown
}

function schemaType(s: JsonSchema): string {
  if (Array.isArray(s.type)) return s.type.find((t) => t !== "null") ?? "string"
  return s.type ?? "string"
}

function fieldKind(s: JsonSchema): "string" | "number" | "boolean" | "enum" {
  if (Array.isArray(s.enum) && s.enum.length) return "enum"
  const t = schemaType(s)
  if (t === "number" || t === "integer") return "number"
  if (t === "boolean") return "boolean"
  return "string"
}

function defaultsFrom(schema?: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, p] of Object.entries(schema?.properties ?? {})) {
    if (p.default !== undefined) out[k] = p.default
    else if (fieldKind(p) === "boolean") out[k] = false
    else out[k] = ""
  }
  return out
}

function buildInput(schema: JsonSchema | undefined, values: Record<string, unknown>): Record<string, unknown> {
  const props = schema?.properties ?? {}
  const required = new Set(schema?.required ?? [])
  const out: Record<string, unknown> = {}
  for (const [k, raw] of Object.entries(values)) {
    const kind = props[k] ? fieldKind(props[k]) : "string"
    if ((raw === "" || raw == null) && !required.has(k)) continue
    if (kind === "number") {
      const n = Number(raw)
      out[k] = Number.isFinite(n) ? n : raw
    } else if (kind === "boolean") {
      out[k] = !!raw
    } else {
      out[k] = raw
    }
  }
  return out
}

export function HitlApprovalPanel({ projectId, node }: { projectId: string; node: WorkerJobNode }) {
  const queueJobId = node.queueJobId
  const queueId = node.queueId
  const stepIndex = node.queueStepIndex

  // Pull the catalog once (SWR-cached) to resolve this step's reviewer JSON schema.
  const { data: catalog } = useSWR(
    queueId ? (["workers:catalog", projectId] as const) : null,
    ([, id]) => consoleApi.getWorkersCatalog(id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const schema = useMemo<JsonSchema | undefined>(() => {
    if (!catalog || !queueId || stepIndex == null) return undefined
    const q = catalog.queues.find((x) => x.id === queueId)
    const step: QueueCatalogStep | undefined = q?.steps?.[stepIndex]
    return step?.hitlInputSchema as JsonSchema | undefined
  }, [catalog, queueId, stepIndex])

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [rawJson, setRawJson] = useState("{\n  \n}")
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState<null | "approve" | "reject">(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | "approved" | "rejected">(null)

  // Seed the form once the schema arrives.
  const seeded = useMemo(() => (schema ? defaultsFrom(schema) : null), [schema])
  const formValues = Object.keys(values).length ? values : seeded ?? {}
  const setField = (k: string, v: unknown) => setValues((prev) => ({ ...(Object.keys(prev).length ? prev : seeded ?? {}), [k]: v }))

  const submit = async (decision: "approve" | "reject") => {
    if (!queueJobId) {
      setError("Missing queue run id for this step.")
      return
    }
    setError(null)
    let input: Record<string, unknown> | undefined
    if (decision === "approve") {
      if (schema) {
        input = buildInput(schema, formValues)
      } else {
        try {
          const parsed = rawJson.trim() ? JSON.parse(rawJson) : {}
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            setError("Reviewer input must be a JSON object.")
            return
          }
          input = parsed
        } catch (e) {
          setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
          return
        }
      }
    }
    setBusy(decision)
    try {
      await consoleApi.queueApprove({ projectId, queueJobId, decision, input, comment: comment.trim() || undefined })
      setDone(decision === "approve" ? "approved" : "rejected")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (done) {
    return (
      <div className="rounded border border-violet-400/50 bg-violet-500/5 p-3 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-300">
          <Check className="size-3.5" /> {done === "approved" ? "Approved — the step is resuming." : "Rejected — the step was failed."}
        </div>
        <p className="mt-1 text-muted-foreground">The run trace will update on the next refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 rounded border border-violet-400/50 bg-violet-500/5 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
        <UserCheck className="size-3.5" /> Reviewer decision
      </div>

      {schema ? (
        <div className="space-y-2.5">
          {Object.entries(schema.properties ?? {}).map(([key, prop]) => {
            const kind = fieldKind(prop)
            const required = (schema.required ?? []).includes(key)
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <Label className="text-[11px] font-medium">{key}</Label>
                  {required && <span className="text-[9px] text-destructive">required</span>}
                </div>
                {prop.description && <p className="text-[10px] text-muted-foreground">{prop.description}</p>}
                {kind === "boolean" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                    <Checkbox checked={!!formValues[key]} onCheckedChange={(v) => setField(key, !!v)} />
                    {formValues[key] ? "true" : "false"}
                  </label>
                ) : kind === "enum" ? (
                  <Select
                    value={formValues[key] != null ? String(formValues[key]) : undefined}
                    onValueChange={(v) => setField(key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(prop.enum ?? []).map((opt) => (
                        <SelectItem key={String(opt)} value={String(opt)}>
                          {String(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={kind === "number" ? "number" : "text"}
                    value={formValues[key] != null ? String(formValues[key]) : ""}
                    onChange={(e) => setField(key, e.target.value)}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            Reviewer input (JSON) — the form will appear here once the queue is redeployed with the HITL schema.
          </Label>
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            spellCheck={false}
            className="min-h-[120px] font-mono text-[11px]"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Comment (optional)</Label>
        <Input value={comment} onChange={(e) => setComment(e.target.value)} className="h-8 text-xs" placeholder="Note for the audit trail" />
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-0.5">
        <Button size="sm" className="h-8 text-xs" disabled={!!busy} onClick={() => submit("approve")}>
          {busy === "approve" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs text-destructive"
          disabled={!!busy}
          onClick={() => submit("reject")}
        >
          {busy === "reject" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <X className="mr-1.5 size-3.5" />}
          Reject
        </Button>
      </div>
    </div>
  )
}
