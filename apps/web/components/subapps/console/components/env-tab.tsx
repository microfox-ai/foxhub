"use client"

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import useSWR from "swr"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { usePermissions } from "@/components/subapps/console/lib/use-permissions"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { beautifyFunctionName } from "@/components/subapps/console/lib/console-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Boxes,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types + analysis
// ---------------------------------------------------------------------------

type FnEnv = { name: string; env: Record<string, string> }
type Row = { key: string; value: string; reveal: boolean }
type Updates = Record<string, Record<string, string>>

/** When false, all env editors render read-only (caller lacks `env.edit`). */
const EnvEditableContext = createContext(true)
const useEnvEditable = () => useContext(EnvEditableContext)

const toRows = (env: Record<string, string>): Row[] =>
  Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value, reveal: false }))

const rowsToEnv = (rows: Row[]): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const r of rows) {
    const k = r.key.trim()
    if (k) env[k] = r.value
  }
  return env
}

const omitKey = (env: Record<string, string>, key: string): Record<string, string> => {
  const { [key]: _drop, ...rest } = env
  return rest
}

function analyzeGroup(fns: FnEnv[]) {
  const total = fns.length
  const keyValues = new Map<string, Set<string>>()
  const keyPresent = new Map<string, number>()
  for (const f of fns) {
    for (const [k, v] of Object.entries(f.env)) {
      if (!keyValues.has(k)) keyValues.set(k, new Set())
      keyValues.get(k)!.add(v)
      keyPresent.set(k, (keyPresent.get(k) || 0) + 1)
    }
  }
  const shared: { key: string; value: string }[] = []
  const differs: string[] = []
  const allKeys: string[] = []
  for (const [k, vals] of keyValues) {
    allKeys.push(k)
    const present = keyPresent.get(k) || 0
    if (present === total && vals.size === 1) shared.push({ key: k, value: [...vals][0]! })
    else differs.push(k)
  }
  shared.sort((a, b) => a.key.localeCompare(b.key))
  differs.sort((a, b) => a.localeCompare(b))
  allKeys.sort((a, b) => a.localeCompare(b))
  return { total, shared, differs, allKeys }
}

function keyStats(fns: FnEnv[], key: string) {
  let present = 0
  const vals = new Set<string>()
  for (const f of fns) {
    if (key in f.env) {
      present++
      vals.add(f.env[key]!)
    }
  }
  return { present, distinct: vals.size }
}

/** Distinct env "profiles" — functions whose full env is identical cluster together. */
function clusterByEnv(fns: FnEnv[]) {
  const map = new Map<string, FnEnv[]>()
  for (const f of fns) {
    const sig = JSON.stringify(Object.entries(f.env).sort(([a], [b]) => a.localeCompare(b)))
    if (!map.has(sig)) map.set(sig, [])
    map.get(sig)!.push(f)
  }
  return [...map.values()].sort((a, b) => b.length - a.length)
}

// ---------------------------------------------------------------------------
// Small reusable bits
// ---------------------------------------------------------------------------

function ValueInput({
  value,
  reveal,
  onChange,
  onToggle,
  placeholder,
  className,
}: {
  value: string
  reveal: boolean
  onChange: (v: string) => void
  onToggle: () => void
  placeholder?: string
  className?: string
}) {
  const editable = useEnvEditable()
  return (
    <div className={cn("relative flex-1", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "value"}
        type={reveal ? "text" : "password"}
        readOnly={!editable}
        className="h-9 pr-9 font-mono text-xs"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={reveal ? "Hide value" : "Reveal value"}
      >
        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function RowsEditor({
  rows,
  setRows,
  filter,
}: {
  rows: Row[]
  setRows: Dispatch<SetStateAction<Row[]>>
  filter?: string
}) {
  const editable = useEnvEditable()
  const update = (i: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const add = () => setRows((p) => [...p, { key: "", value: "", reveal: true }])

  const q = (filter ?? "").trim().toLowerCase()
  const visible = rows.map((r, i) => ({ r, i })).filter(({ r }) => !q || r.key.toLowerCase().includes(q))

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No variables.</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">No variables match “{filter}”.</p>
      ) : (
        visible.map(({ r, i }) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={r.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="KEY"
              readOnly={!editable}
              className="h-9 w-1/3 font-mono text-xs"
            />
            <ValueInput
              value={r.value}
              reveal={r.reveal}
              onChange={(v) => update(i, { value: v })}
              onToggle={() => update(i, { reveal: !r.reveal })}
            />
            {editable ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(i)}
                aria-label="Remove variable"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ))
      )}
      {editable ? (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="mr-2 size-4" />
          Add variable
        </Button>
      ) : null}
    </div>
  )
}

function SaveBar({
  message,
  error,
  children,
}: {
  message?: string | null
  error?: string | null
  children: React.ReactNode
}) {
  const editable = useEnvEditable()
  return (
    <div className="flex items-center justify-end gap-2">
      {message ? <span className="text-xs text-emerald-600">{message}</span> : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      {editable ? children : <span className="text-xs text-muted-foreground">Read-only</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared editor (applies across all functions, preserving each one's unique vars)
// ---------------------------------------------------------------------------

function SharedEditor({
  projectId,
  fns,
  shared,
  filter,
  onSaved,
}: {
  projectId: string
  fns: FnEnv[]
  shared: { key: string; value: string }[]
  filter: string
  onSaved: () => void
}) {
  const originalKeys = useMemo(() => shared.map((s) => s.key), [shared])
  const [rows, setRows] = useState<Row[]>(() =>
    shared.map((s) => ({ key: s.key, value: s.value, reveal: false })),
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setMsg(null)
    setError(null)
    const desired = rowsToEnv(rows)
    const desiredKeys = new Set(Object.keys(desired))
    const updates: Updates = {}
    for (const f of fns) {
      const next = { ...f.env }
      for (const k of originalKeys) if (!desiredKeys.has(k)) delete next[k] // honor removals
      for (const [k, v] of Object.entries(desired)) next[k] = v // set on all
      updates[f.name] = next
    }
    try {
      setSaving(true)
      const res = await consoleApi.updateProjectEnv(projectId, updates)
      setMsg(`Applied to ${res.appliedCount} function${res.appliedCount === 1 ? "" : "s"}`)
      onSaved()
    } catch (e: any) {
      setError(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-emerald-600" />
          Shared across all {fns.length} functions
        </div>
        <SaveBar message={msg} error={error}>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Applying…" : "Save to all"}
          </Button>
        </SaveBar>
      </div>
      <RowsEditor rows={rows} setRows={setRows} filter={filter} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// One variable across functions (edit / set-all / delete-all / per-function)
// ---------------------------------------------------------------------------

function VariableRow({
  projectId,
  fns,
  varKey,
  fnFilter,
  onSaved,
}: {
  projectId: string
  fns: FnEnv[]
  varKey: string
  fnFilter: string
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [setAll, setSetAll] = useState("")
  const [busy, setBusy] = useState(false)
  const [edited, setEdited] = useState<Record<string, string>>({})

  const editable = useEnvEditable()
  const { present, distinct } = keyStats(fns, varKey)
  const valueFor = (f: FnEnv): string => {
    const e = edited[f.name]
    return e !== undefined ? e : (f.env[varKey] ?? "")
  }

  const q = fnFilter.trim().toLowerCase()
  const visibleFns = fns.filter((f) => !q || f.name.toLowerCase().includes(q))

  const run = async (build: () => Updates) => {
    setBusy(true)
    try {
      await consoleApi.updateProjectEnv(projectId, build())
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  const applyToAll = () => run(() => Object.fromEntries(fns.map((f) => [f.name, { ...f.env, [varKey]: setAll }])))
  const saveOne = (f: FnEnv) => run(() => ({ [f.name]: { ...f.env, [varKey]: valueFor(f) } }))
  const deleteOne = (f: FnEnv) => run(() => ({ [f.name]: omitKey(f.env, varKey) }))
  const deleteAll = () => {
    if (!window.confirm(`Delete "${varKey}" from all ${present} function(s)? This cannot be undone.`)) return
    return run(() =>
      Object.fromEntries(fns.filter((f) => varKey in f.env).map((f) => [f.name, omitKey(f.env, varKey)])),
    )
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
      >
        {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        <span className="font-mono text-xs">{varKey}</span>
        <Badge variant="outline" className="ml-auto text-[11px]">
          {distinct} value{distinct === 1 ? "" : "s"}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {present}/{fns.length} set
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t p-3">
          {editable ? (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Set all to</span>
              <ValueInput
                value={setAll}
                reveal={reveal}
                onChange={setSetAll}
                onToggle={() => setReveal((r) => !r)}
                placeholder="value for every function"
              />
              <Button size="sm" variant="outline" onClick={applyToAll} disabled={busy}>
                Apply to all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={deleteAll}
                disabled={busy}
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete from all
              </Button>
            </div>
          ) : null}
          <div className="max-h-[260px] space-y-1.5 overflow-auto pr-1">
            {visibleFns.map((f) => {
              const has = varKey in f.env
              return (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="w-1/3 truncate text-xs" title={f.name}>
                    {beautifyFunctionName(f.name)}
                  </span>
                  <Input
                    value={valueFor(f)}
                    onChange={(e) => setEdited((p) => ({ ...p, [f.name]: e.target.value }))}
                    type={reveal ? "text" : "password"}
                    placeholder={has ? undefined : "not set"}
                    readOnly={!editable}
                    className="h-8 flex-1 font-mono text-xs"
                  />
                  {editable ? (
                    <>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => saveOne(f)} disabled={busy}>
                        Save
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        onClick={() => deleteOne(f)}
                        disabled={busy || !has}
                        aria-label="Delete from this function"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// By-function master/detail
// ---------------------------------------------------------------------------

function SingleFunctionEditor({
  projectId,
  fn,
  groupFns,
  onSaved,
}: {
  projectId: string
  fn: FnEnv
  groupFns: FnEnv[]
  onSaved: () => void
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(fn.env))
  const [saving, setSaving] = useState<"one" | "all" | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const seedKey = fn.name
  const [seeded, setSeeded] = useState(seedKey)
  if (seeded !== seedKey) {
    setSeeded(seedKey)
    setRows(toRows(fn.env))
    setMsg(null)
    setError(null)
  }

  const save = async (mode: "one" | "all") => {
    setMsg(null)
    setError(null)
    const env = rowsToEnv(rows)
    const updates: Updates = {}
    if (mode === "one") updates[fn.name] = env
    else for (const g of groupFns) updates[g.name] = env
    try {
      setSaving(mode)
      const res = await consoleApi.updateProjectEnv(projectId, updates)
      setMsg(mode === "all" ? `Copied to ${res.appliedCount} functions` : "Saved")
      onSaved()
    } catch (e: any) {
      setError(e?.message || "Failed to save")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{beautifyFunctionName(fn.name)}</div>
          <div className="font-mono text-[11px] text-muted-foreground truncate">{fn.name}</div>
        </div>
        <SaveBar message={msg} error={error}>
          {groupFns.length > 1 ? (
            <Button variant="outline" size="sm" onClick={() => save("all")} disabled={saving !== null}>
              {saving === "all" ? "Copying…" : "Copy to all"}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => save("one")} disabled={saving !== null}>
            {saving === "one" ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </div>
      <RowsEditor rows={rows} setRows={setRows} />
    </div>
  )
}

function ByFunctionView({
  projectId,
  fns,
  onSaved,
}: {
  projectId: string
  fns: FnEnv[]
  onSaved: () => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string>(fns[0]?.name ?? "")
  const q = query.trim().toLowerCase()
  const list = fns.filter((f) => !q || f.name.toLowerCase().includes(q))
  const current = fns.find((f) => f.name === selected) ?? list[0] ?? fns[0]

  return (
    <div className="grid gap-3 md:grid-cols-[260px_1fr]">
      <div className="rounded-md border">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search functions…"
            className="h-9 pl-8"
          />
        </div>
        <div className="max-h-[420px] overflow-auto p-1">
          {list.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No functions match.</p>
          ) : (
            list.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setSelected(f.name)}
                className={cn(
                  "block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60",
                  current?.name === f.name && "bg-muted font-medium",
                )}
                title={f.name}
              >
                {beautifyFunctionName(f.name)}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="rounded-md border p-3">
        {current ? (
          <SingleFunctionEditor projectId={projectId} fn={current} groupFns={fns} onSaved={onSaved} />
        ) : (
          <p className="text-sm text-muted-foreground">Select a function.</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manager over an arbitrary set of functions (one group, or the whole project)
// ---------------------------------------------------------------------------

type View = "shared" | "byvar" | "byfn"

function EnvManager({
  projectId,
  fns,
  title,
  badge,
  onSaved,
}: {
  projectId: string
  fns: FnEnv[]
  title: string
  badge?: { label: string; token: ReturnType<typeof getGroupColorToken> }
  onSaved: () => void
}) {
  const [view, setView] = useState<View>("shared")
  const [filter, setFilter] = useState("")

  const { total, shared, differs, allKeys } = useMemo(() => analyzeGroup(fns), [fns])
  const clusters = useMemo(() => clusterByEnv(fns), [fns])

  const q = filter.trim().toLowerCase()
  const visibleDiffs = differs.filter((k) => !q || k.toLowerCase().includes(q))
  const visibleAll = allKeys.filter((k) => !q || k.toLowerCase().includes(q))

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {badge ? (
            <Badge
              variant="outline"
              style={{ backgroundColor: badge.token.bg, borderColor: badge.token.border, color: badge.token.text }}
            >
              {badge.label}
            </Badge>
          ) : null}
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Boxes className="size-3.5" /> {total} fn
            </span>
            <span>{shared.length} shared</span>
            <span>{differs.length} differ</span>
            <span className="flex items-center gap-1">
              <Layers className="size-3.5" /> {clusters.length} profile{clusters.length === 1 ? "" : "s"}
            </span>
          </span>
          <div className="ml-auto inline-flex rounded-md border p-0.5">
            {(
              [
                ["shared", "Shared & differences"],
                ["byvar", "By variable"],
                ["byfn", "By function"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs",
                  view === v ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {view !== "byfn" ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={view === "byvar" ? "Filter variables / functions…" : "Filter variables…"}
              className="h-9 pl-8"
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {view === "shared" ? (
          <>
            <SharedEditor projectId={projectId} fns={fns} shared={shared} filter={filter} onSaved={onSaved} />
            {differs.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Variables that differ between functions</div>
                {visibleDiffs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No differing variables match “{filter}”.</p>
                ) : (
                  visibleDiffs.map((k) => (
                    <VariableRow
                      key={k}
                      projectId={projectId}
                      fns={fns}
                      varKey={k}
                      fnFilter={filter}
                      onSaved={onSaved}
                    />
                  ))
                )}
              </div>
            ) : null}
          </>
        ) : view === "byvar" ? (
          <div className="space-y-2">
            {visibleAll.length === 0 ? (
              <p className="text-xs text-muted-foreground">No variables{filter ? ` match “${filter}”` : ""}.</p>
            ) : (
              visibleAll.map((k) => (
                <VariableRow
                  key={k}
                  projectId={projectId}
                  fns={fns}
                  varKey={k}
                  fnFilter={filter}
                  onSaved={onSaved}
                />
              ))
            )}
          </div>
        ) : (
          <ByFunctionView projectId={projectId} fns={fns} onSaved={onSaved} />
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tab root
// ---------------------------------------------------------------------------

export function EnvTab({ projectId }: { projectId: string }) {
  const [scope, setScope] = useState<"group" | "project">("group")
  const { can } = usePermissions(projectId)
  const canEdit = can("env.edit")

  const { data, error, isLoading, mutate } = useSWR(
    projectId ? ["project-env", projectId] : null,
    () => consoleApi.getProjectEnv(projectId),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const groups = useMemo(() => {
    const g = data?.groups ?? {}
    return Object.keys(g).sort((a, b) =>
      a === "default" ? -1 : b === "default" ? 1 : a.localeCompare(b),
    )
  }, [data?.groups])

  const allFns = useMemo<FnEnv[]>(
    () => groups.flatMap((g) => data?.groups?.[g] ?? []),
    [groups, data?.groups],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    const msg = (error as Error)?.message || ""
    const forbidden = /permission/i.test(msg) || /owner/i.test(msg) || /403/.test(msg)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {forbidden ? "You don't have permission to view environment variables" : "Couldn't load environment"}
          </p>
          {!forbidden ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>
    )
  }

  if (data && data.configured === false) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">AWS isn’t configured on the server</p>
          <p className="text-xs text-muted-foreground">
            Environment variables are read live from the deployed Lambda functions.
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasAnyFunction = allFns.length > 0
  const multiGroup = groups.length > 1

  return (
    <EnvEditableContext.Provider value={canEdit}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            Read live from each function (encrypted at rest by AWS). Platform secrets are hidden.
            {canEdit
              ? " Editing a shared variable updates every function without touching its unique vars."
              : " You have read-only access to environment variables."}
          </span>
        </div>
        {hasAnyFunction && multiGroup ? (
          <div className="inline-flex rounded-md border p-0.5">
            {(
              [
                ["group", "By group"],
                ["project", "Whole project"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs",
                  scope === s ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!hasAnyFunction ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No deployed functions yet — deploy the project to manage its env.
          </CardContent>
        </Card>
      ) : scope === "project" && multiGroup ? (
        <EnvManager
          projectId={projectId}
          fns={allFns}
          title="Whole project"
          onSaved={() => mutate()}
        />
      ) : (
        groups.map((group) => {
          const fns = data?.groups?.[group] ?? []
          if (fns.length === 0) return null
          return (
            <EnvManager
              key={group}
              projectId={projectId}
              fns={fns}
              title="Functions"
              badge={{ label: getGroupLabel(group), token: getGroupColorToken(getGroupLabel(group)) }}
              onSaved={() => mutate()}
            />
          )
        })
      )}
    </div>
    </EnvEditableContext.Provider>
  )
}
