"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import useSWR from "swr"
import {
  consoleApi,
  type WorkerCatalogEntry,
  type WorkerTriggerResult,
  type QueueTriggerResult,
} from "@/components/subapps/console/lib/console-api"
import { usePermissions } from "@/components/subapps/console/lib/use-permissions"
import { WorkerRunView } from "@/components/subapps/console/components/worker-run-view"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Play,
  Plus,
  Trash2,
  RefreshCcw,
  KeyRound,
  Lock,
  Zap,
  Braces,
  ListChecks,
  AlertTriangle,
  FileJson,
  Layers,
  ArrowRight,
  Clock,
  UserCheck,
  Search,
  ArrowDownUp,
  History,
} from "lucide-react"

// --- JSON Schema helpers ---------------------------------------------------

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  enum?: unknown[]
  items?: JsonSchema
  description?: string
  default?: unknown
  format?: string
  const?: unknown
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
}

/**
 * Flatten a worker input schema into the object "variants" the form can render. zod unions /
 * discriminated unions compile to `anyOf`/`oneOf`, so a single worker can accept several shapes
 * (e.g. `{ mode: 'echo', … }` vs `{ mode: 'process', … }`) — we render one variant at a time.
 */
function schemaVariants(schema?: JsonSchema): JsonSchema[] {
  if (!schema) return []
  const branches = schema.anyOf ?? schema.oneOf
  if (Array.isArray(branches) && branches.length) {
    return branches.filter((b) => b && (b.properties || b.type === "object"))
  }
  if (schema.properties && Object.keys(schema.properties).length) return [schema]
  return []
}

/** Human label for a union variant — uses the discriminator (a `const` property) when present. */
function variantLabel(schema: JsonSchema, index: number): string {
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    if (prop.const !== undefined) return `${key}: ${String(prop.const)}`
    if (Array.isArray(prop.enum) && prop.enum.length === 1) return `${key}: ${String(prop.enum[0])}`
  }
  return `Variant ${index + 1}`
}

type FieldKind = "string" | "number" | "boolean" | "enum" | "json"

function schemaType(s: JsonSchema): string {
  if (Array.isArray(s.type)) return s.type.find((t) => t !== "null") ?? "string"
  return s.type ?? "string"
}

function fieldKind(s: JsonSchema): FieldKind {
  if (Array.isArray(s.enum) && s.enum.length) return "enum"
  const t = schemaType(s)
  if (t === "number" || t === "integer") return "number"
  if (t === "boolean") return "boolean"
  if (t === "string") return "string"
  return "json"
}

/** Build the default form-state map from a worker's object schema. */
function defaultsFromSchema(schema?: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const props = schema?.properties ?? {}
  for (const [key, prop] of Object.entries(props)) {
    if (prop.const !== undefined) out[key] = prop.const
    else if (prop.default !== undefined) out[key] = prop.default
    else if (fieldKind(prop) === "boolean") out[key] = false
    else out[key] = ""
  }
  return out
}

/** Coerce raw form values into a typed input object per the schema. */
function buildInputFromForm(
  schema: JsonSchema | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const props = schema?.properties ?? {}
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) {
    const prop = props[key]
    const kind = prop ? fieldKind(prop) : "string"
    if (raw === "" || raw === undefined || raw === null) {
      // Skip empty optional fields; keep empty required strings so the worker can validate.
      if (!(schema?.required ?? []).includes(key)) continue
    }
    if (kind === "number") {
      const n = Number(raw)
      out[key] = Number.isFinite(n) ? n : raw
    } else if (kind === "boolean") {
      out[key] = !!raw
    } else if (kind === "json") {
      if (typeof raw === "string" && raw.trim()) {
        try {
          out[key] = JSON.parse(raw)
        } catch {
          out[key] = raw
        }
      } else if (raw !== "") {
        out[key] = raw
      }
    } else {
      out[key] = raw
    }
  }
  return out
}

type KvRow = { id: string; key: string; value: string }
const newRow = (): KvRow => ({ id: Math.random().toString(36).slice(2), key: "", value: "" })
function rowsToObject(rows: KvRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) if (r.key.trim()) out[r.key.trim()] = r.value
  return out
}

const KEY_SOURCE_LABEL: Record<string, string> = {
  env: "Auto · from deployed env",
  derived: "Auto · derived from project id",
  none: "Manual key required",
}

// --- Component -------------------------------------------------------------

export function RunTestTab({ projectId }: { projectId: string }) {
  const router = useRouter()
  const params = useParams()
  const organizationId = params?.organizationId as string | undefined
  // Jump to the History tab pre-filtered to this worker/queue id.
  const viewHistory = useCallback(
    (id: string) => {
      if (organizationId)
        router.push(
          `/dashboard/${organizationId}/${projectId}?tab=history&runq=${encodeURIComponent(id)}`,
          { scroll: false },
        )
    },
    [router, organizationId, projectId],
  )
  const { can, ready } = usePermissions(projectId)
  const canTrigger = !ready || can("workers.trigger") || can("deployment.create")
  const canViewLogs =
    !ready ||
    can("workers.view") ||
    can("deployment.logs.view") ||
    can("observability.view")

  const {
    data: catalog,
    error: catalogError,
    isLoading,
    mutate: refreshCatalog,
  } = useSWR(
    projectId ? (["workers:catalog", projectId] as const) : null,
    ([, id]) => consoleApi.getWorkersCatalog(id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const workers = catalog?.workers ?? []
  const queues = catalog?.queues ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(
    () => workers.find((w) => w.workerId === selectedId) ?? workers[0],
    [workers, selectedId],
  )

  // Workers vs Queues view. Default to whichever exists (queues-only projects open on Queues).
  const [kind, setKind] = useState<"workers" | "queues">("workers")
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null)
  const selectedQueue = useMemo(
    () => queues.find((q) => q.id === selectedQueueId) ?? queues[0],
    [queues, selectedQueueId],
  )

  useEffect(() => {
    const first = workers[0]
    if (!selectedId && first) setSelectedId(first.workerId)
  }, [workers, selectedId])

  useEffect(() => {
    const first = queues[0]
    if (!selectedQueueId && first) setSelectedQueueId(first.id)
  }, [queues, selectedQueueId])

  // If a project has only queues, land on the Queues view.
  useEffect(() => {
    if (!workers.length && queues.length) setKind("queues")
  }, [workers.length, queues.length])

  // Worker list filters/search/sort.
  const [workerSearch, setWorkerSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"group" | "name">("group")

  const groupOptions = useMemo(() => {
    const set = new Set<string>()
    for (const w of workers) set.add(w.group || "default")
    return Array.from(set).sort()
  }, [workers])

  const visibleWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase()
    const list = workers.filter((w) => {
      if (groupFilter !== "all" && (w.group || "default") !== groupFilter) return false
      if (q && !w.workerId.toLowerCase().includes(q)) return false
      return true
    })
    return list.sort((a, b) =>
      sortBy === "name"
        ? a.workerId.localeCompare(b.workerId)
        : a.group !== b.group
          ? (a.group || "").localeCompare(b.group || "")
          : a.workerId.localeCompare(b.workerId),
    )
  }, [workers, workerSearch, groupFilter, sortBy])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Skeleton className="h-[400px] rounded-lg" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    )
  }

  if (catalogError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="size-8 text-amber-500" />
          <div className="text-sm text-muted-foreground">
            {(catalogError as Error).message || "Failed to load workers."}
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshCatalog()}>
            <RefreshCcw className="mr-2 size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!workers.length && !queues.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Zap className="size-8 text-muted-foreground" />
          <div className="text-sm font-medium">No workers found</div>
          <p className="max-w-md text-xs text-muted-foreground">
            {catalog?.agentConfigured
              ? "This project's core endpoint is deployed but exposes no workers, or the worker-endpoint key couldn't be resolved. Push a deployment with at least one worker."
              : "Deploy this project (with at least one worker) before triggering. Workers are reachable only via the core /workers/trigger endpoint."}
          </p>
          {catalog?.agentConfigured && <RawConfigDialog projectId={projectId} />}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Workers / Queues switch — only shown when the project has queues to choose from. */}
      {queues.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            <Button
              variant={kind === "workers" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-none px-3 text-xs"
              onClick={() => setKind("workers")}
            >
              <Zap className="mr-1.5 size-3.5" /> Workers
              <Badge variant="outline" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {workers.length}
              </Badge>
            </Button>
            <Button
              variant={kind === "queues" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-none px-3 text-xs"
              onClick={() => setKind("queues")}
            >
              <Layers className="mr-1.5 size-3.5" /> Queues
              <Badge variant="outline" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {queues.length}
              </Badge>
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <RawConfigDialog projectId={projectId} compact />
            <Button variant="ghost" size="icon" className="size-7" onClick={() => refreshCatalog()}>
              <RefreshCcw className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {kind === "queues" ? (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Queue list */}
          <div className="flex flex-col gap-2">
            <span className="px-1 text-xs font-medium text-muted-foreground">
              {queues.length} queue{queues.length === 1 ? "" : "s"}
            </span>
            <div className="flex flex-col gap-1">
              {queues.map((q) => {
                const steps = (q.steps ?? []) as QueueStepInfo[]
                const active = selectedQueue?.id === q.id
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQueueId(q.id)}
                    className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-colors ${
                      active ? "border-primary bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="truncate text-sm font-medium">{q.id}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                        {steps.length} step{steps.length === 1 ? "" : "s"}
                      </Badge>
                      {q.schedule != null && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" /> scheduled
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Queue trigger panel */}
          {selectedQueue && (
            <QueueTriggerPanel
              key={selectedQueue.id}
              projectId={projectId}
              queue={selectedQueue}
              workers={workers}
              keySource={catalog?.keySource ?? "none"}
              canTrigger={canTrigger}
              onViewHistory={viewHistory}
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Worker list */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {visibleWorkers.length === workers.length
                  ? `${workers.length} worker${workers.length === 1 ? "" : "s"}`
                  : `${visibleWorkers.length} of ${workers.length}`}
              </span>
              {queues.length === 0 && (
                <div className="flex items-center gap-1">
                  <RawConfigDialog projectId={projectId} compact />
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => refreshCatalog()}>
                    <RefreshCcw className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Search + group filter + sort */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  placeholder="Search workers…"
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {groupOptions.length > 1 && (
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All groups</SelectItem>
                      {groupOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {getGroupLabel(g)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  title={`Sort by ${sortBy === "group" ? "name" : "group"}`}
                  onClick={() => setSortBy((s) => (s === "group" ? "name" : "group"))}
                >
                  <ArrowDownUp className="mr-1.5 size-3.5" /> {sortBy === "group" ? "Group" : "Name"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {!visibleWorkers.length && (
                <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
                  No workers match your filters.
                </p>
              )}
              {visibleWorkers.map((w) => {
                const token = getGroupColorToken(getGroupLabel(w.group))
                const active = selected?.workerId === w.workerId
                return (
                  <button
                    key={w.workerId}
                    onClick={() => setSelectedId(w.workerId)}
                    className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-colors ${
                      active ? "border-primary bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="truncate text-sm font-medium">{w.workerId}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[10px]"
                        style={{ backgroundColor: token.bg, borderColor: token.border, color: token.text }}
                      >
                        {getGroupLabel(w.group)}
                      </Badge>
                      {!w.inputSchema && (
                        <span className="text-[10px] text-muted-foreground">no schema</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trigger panel */}
          {selected && (
            <WorkerTriggerPanel
              key={selected.workerId}
              projectId={projectId}
              worker={selected}
              keySource={catalog?.keySource ?? "none"}
              configReachable={!!catalog?.configReachable}
              canTrigger={canTrigger}
              canViewLogs={canViewLogs}
              onViewHistory={viewHistory}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** One step as returned by /workers/config (functions are stripped server-side). */
type QueueStepInfo = { workerId: string; delaySeconds?: number; requiresApproval?: boolean }
type QueueInfo = { id: string; steps?: unknown[]; schedule?: unknown }

function WorkerTriggerPanel({
  projectId,
  worker,
  keySource,
  configReachable,
  canTrigger,
  canViewLogs,
  onViewHistory,
}: {
  projectId: string
  worker: WorkerCatalogEntry
  keySource: "env" | "derived" | "none"
  configReachable: boolean
  canTrigger: boolean
  canViewLogs: boolean
  onViewHistory: (id: string) => void
}) {
  const schema = worker.inputSchema as JsonSchema | undefined
  const variants = useMemo(() => schemaVariants(schema), [schema])
  const hasSchema = variants.length > 0

  // Input state. For union schemas, `variantIndex` selects which branch the form edits.
  const [variantIndex, setVariantIndex] = useState(0)
  const activeVariant = variants[variantIndex]
  const [jsonMode, setJsonMode] = useState(!hasSchema)
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() =>
    defaultsFromSchema(variants[0]),
  )
  const [rawJson, setRawJson] = useState(() =>
    JSON.stringify(buildInputFromForm(variants[0], defaultsFromSchema(variants[0])), null, 2),
  )

  // Switching union variant reseeds the form with that branch's defaults.
  const selectVariant = useCallback(
    (idx: number) => {
      setVariantIndex(idx)
      setFormValues(defaultsFromSchema(variants[idx]))
    },
    [variants],
  )

  // Auth & params state
  const [keyOverride, setKeyOverride] = useState("")
  const [keyHeaderName, setKeyHeaderName] = useState("x-workers-trigger-key")
  const [headerRows, setHeaderRows] = useState<KvRow[]>([newRow()])
  const [queryRows, setQueryRows] = useState<KvRow[]>([newRow()])

  // Trigger result state
  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<WorkerTriggerResult | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("input")

  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const trigger = useCallback(async () => {
    setTriggerError(null)
    let input: Record<string, unknown> | undefined
    let rawBody: Record<string, unknown> | undefined
    if (jsonMode) {
      try {
        const parsed = rawJson.trim() ? JSON.parse(rawJson) : {}
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed
        else {
          setTriggerError("Custom JSON must be an object.")
          return
        }
      } catch (e) {
        setTriggerError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    } else {
      input = buildInputFromForm(activeVariant, formValues)
    }

    setTriggering(true)
    try {
      const res = await consoleApi.triggerWorker({
        projectId,
        workerId: worker.workerId,
        input,
        rawBody,
        keyOverride: keyOverride.trim() || undefined,
        keyHeaderName: keyHeaderName.trim() || undefined,
        extraHeaders: rowsToObject(headerRows),
        queryParams: rowsToObject(queryRows),
      })
      setResult(res)
      setActiveTab("run")
    } catch (e) {
      setTriggerError(e instanceof Error ? e.message : String(e))
    } finally {
      setTriggering(false)
    }
  }, [jsonMode, rawJson, activeVariant, formValues, projectId, worker.workerId, keyOverride, keyHeaderName, headerRows, queryRows])

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-primary" /> {worker.workerId}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => onViewHistory(worker.workerId)}
              title="See past runs of this worker"
            >
              <History className="mr-1.5 size-3.5" /> History
            </Button>
            <KeySourceBadge source={keySource} hasOverride={!!keyOverride.trim()} />
            <Button size="sm" disabled={!canTrigger || triggering} onClick={trigger}>
              <Play className="mr-2 size-4" />
              {triggering ? "Triggering…" : "Trigger"}
            </Button>
          </div>
        </div>
        {worker.functionName && (
          <p className="font-mono text-[11px] text-muted-foreground">{worker.functionName}</p>
        )}
        {!configReachable && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Live schema unavailable — showing the deployed worker without its input shape. You can
            still trigger it with custom JSON.
          </p>
        )}
        {!canTrigger && (
          <p className="text-[11px] text-muted-foreground">
            You can view this worker but lack the <code>deployment.create</code> permission to trigger it.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="input">
              <Braces className="mr-1.5 size-3.5" /> Input
            </TabsTrigger>
            <TabsTrigger value="auth">
              <KeyRound className="mr-1.5 size-3.5" /> Auth &amp; Params
            </TabsTrigger>
            <TabsTrigger value="run">
              <ListChecks className="mr-1.5 size-3.5" /> Run &amp; output
            </TabsTrigger>
          </TabsList>

          {/* Input */}
          <TabsContent value="input" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {hasSchema ? "Auto-generated from the worker's input schema." : "This worker has no published schema."}
              </span>
              {hasSchema && (
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={jsonMode}
                    onCheckedChange={(v) => {
                      const next = !!v
                      if (next) {
                        // entering JSON mode: seed from current form values
                        setRawJson(JSON.stringify(buildInputFromForm(activeVariant, formValues), null, 2))
                      }
                      setJsonMode(next)
                    }}
                  />
                  Edit as raw JSON
                </label>
              )}
            </div>

            {!jsonMode && hasSchema && variants.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Input variant (this worker accepts several shapes)</Label>
                <Select value={String(variantIndex)} onValueChange={(v) => selectVariant(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {variantLabel(v, i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {jsonMode || !activeVariant ? (
              <Textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                spellCheck={false}
                className="min-h-[260px] font-mono text-xs"
                placeholder='{ "key": "value" }'
              />
            ) : (
              <SchemaForm schema={activeVariant} values={formValues} onChange={setField} />
            )}
          </TabsContent>

          {/* Auth & Params */}
          <TabsContent value="auth" className="mt-4 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="size-3.5 text-muted-foreground" />
                <Label className="text-xs">Worker API key</Label>
              </div>
              <Input
                type="password"
                value={keyOverride}
                onChange={(e) => setKeyOverride(e.target.value)}
                placeholder={
                  keySource === "none"
                    ? "No key auto-resolved — paste the worker-endpoint key"
                    : "Using auto-resolved key (override here if needed)"
                }
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {keySource === "none"
                  ? "We couldn't resolve a key server-side. Enter the WORKERS_API_KEY for this deployment."
                  : "The key is resolved on the server and never sent to your browser. Override only if the deployment uses a different key."}
              </p>
              <div className="grid max-w-md grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-[11px] text-muted-foreground">Key header name</Label>
                <Input
                  value={keyHeaderName}
                  onChange={(e) => setKeyHeaderName(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <KvEditor label="Headers" rows={headerRows} setRows={setHeaderRows} placeholderKey="X-Custom-Header" />
            <KvEditor label="Query params" rows={queryRows} setRows={setQueryRows} placeholderKey="param" />
          </TabsContent>

          {/* Run & output — trigger response + trigger logs, then the live job/output/log tree */}
          <TabsContent value="run" className="mt-4">
            {triggerError && (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {triggerError}
              </div>
            )}
            {result ? (
              <WorkerRunView
                key={result.jobId}
                projectId={projectId}
                run={{ jobId: result.jobId, ok: result.ok, status: result.status, response: result.response }}
                loadRun={() =>
                  consoleApi.getWorkerJob({ projectId, jobId: result.jobId, workerId: result.workerId })
                }
                triggerLabel="Trigger response"
                triggerLog={{ target: "trigger" }}
              />
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Trigger the worker to watch its status, final output, and logs here.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function QueueTriggerPanel({
  projectId,
  queue,
  workers,
  keySource,
  canTrigger,
  onViewHistory,
}: {
  projectId: string
  queue: QueueInfo
  workers: WorkerCatalogEntry[]
  keySource: "env" | "derived" | "none"
  canTrigger: boolean
  onViewHistory: (id: string) => void
}) {
  const steps = useMemo(() => (queue.steps ?? []) as QueueStepInfo[], [queue.steps])
  const firstStep = steps[0]
  // The queue's initial input == the first step's worker input. Reuse that worker's schema.
  const firstWorker = useMemo(
    () => workers.find((w) => w.workerId === firstStep?.workerId),
    [workers, firstStep],
  )
  const schema = firstWorker?.inputSchema as JsonSchema | undefined
  const variants = useMemo(() => schemaVariants(schema), [schema])
  const hasSchema = variants.length > 0

  const [variantIndex, setVariantIndex] = useState(0)
  const activeVariant = variants[variantIndex]
  const [jsonMode, setJsonMode] = useState(!hasSchema)
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() =>
    defaultsFromSchema(variants[0]),
  )
  const [rawJson, setRawJson] = useState(() =>
    JSON.stringify(buildInputFromForm(variants[0], defaultsFromSchema(variants[0])), null, 2),
  )

  const selectVariant = useCallback(
    (idx: number) => {
      setVariantIndex(idx)
      setFormValues(defaultsFromSchema(variants[idx]))
    },
    [variants],
  )

  // Auth & params state
  const [keyOverride, setKeyOverride] = useState("")
  const [keyHeaderName, setKeyHeaderName] = useState("x-workers-trigger-key")
  const [headerRows, setHeaderRows] = useState<KvRow[]>([newRow()])
  const [queryRows, setQueryRows] = useState<KvRow[]>([newRow()])

  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<QueueTriggerResult | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("input")

  const setField = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const trigger = useCallback(async () => {
    setTriggerError(null)
    let input: Record<string, unknown> | undefined
    if (jsonMode) {
      try {
        const parsed = rawJson.trim() ? JSON.parse(rawJson) : {}
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed
        else {
          setTriggerError("Custom JSON must be an object.")
          return
        }
      } catch (e) {
        setTriggerError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    } else {
      input = buildInputFromForm(activeVariant, formValues)
    }

    setTriggering(true)
    try {
      const res = await consoleApi.triggerQueue({
        projectId,
        queueId: queue.id,
        input,
        keyOverride: keyOverride.trim() || undefined,
        keyHeaderName: keyHeaderName.trim() || undefined,
        extraHeaders: rowsToObject(headerRows),
        queryParams: rowsToObject(queryRows),
      })
      setResult(res)
      setActiveTab("run")
    } catch (e) {
      setTriggerError(e instanceof Error ? e.message : String(e))
    } finally {
      setTriggering(false)
    }
  }, [jsonMode, rawJson, activeVariant, formValues, projectId, queue.id, keyOverride, keyHeaderName, headerRows, queryRows])

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" /> {queue.id}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => onViewHistory(queue.id)}
              title="See past runs of this queue"
            >
              <History className="mr-1.5 size-3.5" /> History
            </Button>
            <KeySourceBadge source={keySource} hasOverride={!!keyOverride.trim()} />
            <Button size="sm" disabled={!canTrigger || triggering} onClick={trigger}>
              <Play className="mr-2 size-4" />
              {triggering ? "Starting…" : "Start queue"}
            </Button>
          </div>
        </div>
        {/* Pipeline strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                {s.workerId}
                {s.requiresApproval && <UserCheck className="size-2.5 text-amber-500" />}
                {s.delaySeconds ? (
                  <span className="text-muted-foreground">+{s.delaySeconds}s</span>
                ) : null}
              </Badge>
            </div>
          ))}
        </div>
        {!canTrigger && (
          <p className="text-[11px] text-muted-foreground">
            You can view this queue but lack the <code>workers.trigger</code> permission to start it.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="input">
              <Braces className="mr-1.5 size-3.5" /> Initial input
            </TabsTrigger>
            <TabsTrigger value="auth">
              <KeyRound className="mr-1.5 size-3.5" /> Auth &amp; Params
            </TabsTrigger>
            <TabsTrigger value="run">
              <ListChecks className="mr-1.5 size-3.5" /> Run &amp; output
            </TabsTrigger>
          </TabsList>

          {/* Initial input — fed to the first step's worker */}
          <TabsContent value="input" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {firstStep
                  ? hasSchema
                    ? `Initial input for the first step (${firstStep.workerId}).`
                    : `First step (${firstStep.workerId}) has no published schema — pass custom JSON.`
                  : "This queue has no steps."}
              </span>
              {hasSchema && (
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <Checkbox
                    checked={jsonMode}
                    onCheckedChange={(v) => {
                      const next = !!v
                      if (next) {
                        setRawJson(JSON.stringify(buildInputFromForm(activeVariant, formValues), null, 2))
                      }
                      setJsonMode(next)
                    }}
                  />
                  Edit as raw JSON
                </label>
              )}
            </div>

            {!jsonMode && hasSchema && variants.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Input variant</Label>
                <Select value={String(variantIndex)} onValueChange={(v) => selectVariant(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {variantLabel(v, i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {jsonMode || !activeVariant ? (
              <Textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                spellCheck={false}
                className="min-h-[260px] font-mono text-xs"
                placeholder='{ "key": "value" }'
              />
            ) : (
              <SchemaForm schema={activeVariant} values={formValues} onChange={setField} />
            )}
          </TabsContent>

          {/* Auth & Params */}
          <TabsContent value="auth" className="mt-4 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="size-3.5 text-muted-foreground" />
                <Label className="text-xs">Worker API key</Label>
              </div>
              <Input
                type="password"
                value={keyOverride}
                onChange={(e) => setKeyOverride(e.target.value)}
                placeholder={
                  keySource === "none"
                    ? "No key auto-resolved — paste the worker-endpoint key"
                    : "Using auto-resolved key (override here if needed)"
                }
                className="font-mono text-xs"
              />
              <div className="grid max-w-md grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-[11px] text-muted-foreground">Key header name</Label>
                <Input
                  value={keyHeaderName}
                  onChange={(e) => setKeyHeaderName(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>

            <KvEditor label="Headers" rows={headerRows} setRows={setHeaderRows} placeholderKey="X-Custom-Header" />
            <KvEditor label="Query params" rows={queryRows} setRows={setQueryRows} placeholderKey="param" />
          </TabsContent>

          {/* Run & output — queue start response + per-step status/output/logs as a chain */}
          <TabsContent value="run" className="mt-4">
            {triggerError && (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {triggerError}
              </div>
            )}
            {result ? (
              <WorkerRunView
                key={result.queueJobId}
                projectId={projectId}
                run={{
                  jobId: result.queueJobId,
                  ok: result.ok,
                  status: result.status,
                  response: result.response,
                }}
                loadRun={() => consoleApi.getQueueJob({ projectId, queueJobId: result.queueJobId })}
                triggerLabel="Queue start response"
                triggerLog={{ target: "queue", queueId: queue.id }}
              />
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Start the queue to watch each step&apos;s status, output, and logs here.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function KeySourceBadge({ source, hasOverride }: { source: string; hasOverride: boolean }) {
  if (hasOverride) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <KeyRound className="size-3" /> Manual key
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] ${source === "none" ? "border-amber-500 text-amber-600 dark:text-amber-400" : ""}`}
    >
      <KeyRound className="size-3" /> {KEY_SOURCE_LABEL[source] ?? source}
    </Badge>
  )
}

function SchemaForm({
  schema,
  values,
  onChange,
}: {
  schema: JsonSchema
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const props = schema.properties ?? {}
  const required = new Set(schema.required ?? [])
  return (
    <div className="space-y-4">
      {Object.entries(props).map(([key, prop]) => {
        const kind = fieldKind(prop)
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <Label className="text-xs font-medium">{key}</Label>
              {required.has(key) && <span className="text-[10px] text-destructive">required</span>}
              <span className="text-[10px] text-muted-foreground">{schemaType(prop)}</span>
            </div>
            {prop.description && (
              <p className="text-[11px] text-muted-foreground">{prop.description}</p>
            )}
            {prop.const !== undefined ? (
              <Input value={String(prop.const)} disabled className="h-9 font-mono" />
            ) : kind === "boolean" ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={!!values[key]}
                  onCheckedChange={(v) => onChange(key, !!v)}
                />
                {values[key] ? "true" : "false"}
              </label>
            ) : kind === "enum" ? (
              <Select
                value={values[key] != null ? String(values[key]) : undefined}
                onValueChange={(v) => onChange(key, v)}
              >
                <SelectTrigger className="h-9">
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
            ) : kind === "json" ? (
              <Textarea
                value={typeof values[key] === "string" ? (values[key] as string) : JSON.stringify(values[key] ?? "", null, 2)}
                onChange={(e) => onChange(key, e.target.value)}
                spellCheck={false}
                className="min-h-[80px] font-mono text-xs"
                placeholder={`JSON ${schemaType(prop)}`}
              />
            ) : (
              <Input
                type={kind === "number" ? "number" : "text"}
                value={values[key] != null ? String(values[key]) : ""}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={prop.format || schemaType(prop)}
                className="h-9"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function KvEditor({
  label,
  rows,
  setRows,
  placeholderKey,
}: {
  label: string
  rows: KvRow[]
  setRows: React.Dispatch<React.SetStateAction<KvRow[]>>
  placeholderKey: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input
              value={row.key}
              onChange={(e) =>
                setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)))
              }
              placeholder={placeholderKey}
              className="h-8 font-mono text-xs"
            />
            <Input
              value={row.value}
              onChange={(e) =>
                setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))
              }
              placeholder="value"
              className="h-8 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== row.id) : [newRow()]))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRows((prev) => [...prev, newRow()])}>
        <Plus className="mr-1 size-3.5" /> Add row
      </Button>
    </div>
  )
}

function RawConfigDialog({ projectId, compact }: { projectId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ url: string; status: number; keySource: string; config: unknown } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await consoleApi.getWorkersConfigRaw(projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o && !data && !loading) void load()
      }}
    >
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon" className="size-7" title="View raw /workers/config">
            <FileJson className="size-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <FileJson className="mr-2 size-4" /> View raw /workers/config
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileJson className="size-4" /> GET /workers/config
          </DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {data && (
              <>
                <Badge variant={data.status === 200 ? "default" : "destructive"}>{data.status}</Badge>
                <Badge variant="outline" className="text-[10px]">key: {data.keySource}</Badge>
                <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{data.url}</span>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => load()} disabled={loading}>
              <RefreshCcw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>
          {error && <div className="text-xs text-destructive">{error}</div>}
          {/* min-w-0 lets this grid child shrink below its content width so overflow-auto scrolls
              horizontally INSIDE the box instead of stretching the dialog past max-w-3xl. */}
          <pre className="max-h-[60vh] min-w-0 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
            {loading && !data ? "Loading…" : data ? JSON.stringify(data.config, null, 2) : ""}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

