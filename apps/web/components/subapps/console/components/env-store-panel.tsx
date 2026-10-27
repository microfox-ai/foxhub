"use client"

import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import useSWR from "swr"
import { consoleApi } from "@/components/subapps/console/lib/console-api"
import { getGroupColorToken, getGroupLabel } from "@/components/subapps/console/lib/group-colors"
import { stageLabel } from "./stage-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, EyeOff, Plus, Trash2, Database, DownloadCloud, ShieldCheck } from "lucide-react"

type Row = { key: string; value: string; reveal: boolean }
type FnEnv = { name: string; env: Record<string, string> }

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

/** Vars present with the SAME value across every function in the set (the importable "shared" env). */
function sharedAcross(fns: FnEnv[]): Record<string, string> {
  if (fns.length === 0) return {}
  const counts = new Map<string, Set<string>>()
  const present = new Map<string, number>()
  for (const f of fns) {
    for (const [k, v] of Object.entries(f.env)) {
      if (!counts.has(k)) counts.set(k, new Set())
      counts.get(k)!.add(v)
      present.set(k, (present.get(k) || 0) + 1)
    }
  }
  const out: Record<string, string> = {}
  for (const [k, vals] of counts) {
    if (present.get(k) === fns.length && vals.size === 1) out[k] = [...vals][0]!
  }
  return out
}

function RowsEditor({
  rows,
  setRows,
  editable,
}: {
  rows: Row[]
  setRows: Dispatch<SetStateAction<Row[]>>
  editable: boolean
}) {
  const update = (i: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i))
  const add = () => setRows((p) => [...p, { key: "", value: "", reveal: true }])

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No variables in this layer.</p>
      ) : (
        rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={r.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="KEY"
              readOnly={!editable}
              className="h-9 w-1/3 font-mono text-xs"
            />
            <div className="relative flex-1">
              <Input
                value={r.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="value"
                type={r.reveal ? "text" : "password"}
                readOnly={!editable}
                className="h-9 pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => update(i, { reveal: !r.reveal })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={r.reveal ? "Hide value" : "Reveal value"}
              >
                {r.reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
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

/**
 * One editable store layer (project-wide, or one group). Save persists to the durable store
 * AND live-pushes to the affected functions. "Import current live env" seeds the layer with the
 * vars currently shared across this scope's live functions (a one-time snapshot at cutover).
 */
function LayerEditor({
  title,
  badge,
  initial,
  liveShared,
  editable,
  onSave,
}: {
  title: string
  badge?: { label: string; token: ReturnType<typeof getGroupColorToken> }
  initial: Record<string, string>
  liveShared: Record<string, string>
  editable: boolean
  onSave: (env: Record<string, string>) => Promise<{ appliedCount: number }>
}) {
  const seed = JSON.stringify(initial)
  const [seeded, setSeeded] = useState(seed)
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Re-seed if the underlying store data changed (e.g. after a save refetch or stage switch).
  if (seeded !== seed) {
    setSeeded(seed)
    setRows(toRows(initial))
    setMsg(null)
    setError(null)
  }

  const importLive = () => {
    const existing = new Set(rows.map((r) => r.key.trim()).filter(Boolean))
    const additions = Object.entries(liveShared)
      .filter(([k]) => !existing.has(k))
      .map(([key, value]) => ({ key, value, reveal: false }))
    if (additions.length === 0) {
      setMsg("Nothing new to import — all shared live vars are already in this layer.")
      return
    }
    setRows((p) => [...p, ...additions])
    setMsg(`Imported ${additions.length} live var${additions.length === 1 ? "" : "s"} — review, then Save.`)
  }

  const save = async () => {
    setMsg(null)
    setError(null)
    try {
      setSaving(true)
      const { appliedCount } = await onSave(rowsToEnv(rows))
      setMsg(`Saved — applied live to ${appliedCount} function${appliedCount === 1 ? "" : "s"}.`)
    } catch (e: any) {
      setError(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const importCount = useMemo(() => {
    const existing = new Set(rows.map((r) => r.key.trim()).filter(Boolean))
    return Object.keys(liveShared).filter((k) => !existing.has(k)).length
  }, [rows, liveShared])

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge ? (
            <Badge
              variant="outline"
              style={{ backgroundColor: badge.token.bg, borderColor: badge.token.border, color: badge.token.text }}
            >
              {badge.label}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {msg ? <span className="text-xs text-emerald-600">{msg}</span> : null}
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
          {editable ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={importLive}
                disabled={saving || importCount === 0}
                title={importCount === 0 ? "No new shared live vars to import" : `Import ${importCount} shared live var(s)`}
              >
                <DownloadCloud className="mr-1.5 size-4" />
                Import live{importCount > 0 ? ` (${importCount})` : ""}
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Read-only</span>
          )}
        </div>
      </div>
      <RowsEditor rows={rows} setRows={setRows} editable={editable} />
    </div>
  )
}

/**
 * Server-managed env store (Plan E Phase 3). Unlike the live per-function editor below, these
 * layers are stored durably and re-injected on every deploy, so they survive redeploys. On a key
 * conflict, a store value wins over the deployment's env.json. Two layers are managed here:
 * project-wide and per-group; per-function overrides remain available via the live editor.
 */
export function EnvStorePanel({
  projectId,
  stage,
  groups,
  liveByGroup,
  canEdit,
}: {
  projectId: string
  stage: string
  /** Deployment groups present at this stage (from the live-env fetch). */
  groups: string[]
  /** Live functions per group, for the "import current live env" snapshot. */
  liveByGroup: Record<string, FnEnv[]>
  canEdit: boolean
}) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? ["env-store", projectId, stage] : null,
    () => consoleApi.getProjectEnvStore(projectId, stage),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const allLiveFns = useMemo(() => Object.values(liveByGroup).flat(), [liveByGroup])
  const projectShared = useMemo(() => sharedAcross(allLiveFns), [allLiveFns])
  const multiGroup = groups.filter((g) => g !== "default").length > 0 || groups.length > 1

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Server-managed env</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full rounded-md" />
        </CardContent>
      </Card>
    )
  }

  // The store routes require env.view; a 403 here means the same as the live editor's — let that
  // component surface the permission state. Render nothing rather than a duplicate error.
  if (error) return null

  const saveLayer = async (
    payload: Parameters<typeof consoleApi.updateProjectEnvStore>[1],
  ) => {
    const res = await consoleApi.updateProjectEnvStore(projectId, payload)
    await mutate()
    return { appliedCount: res.appliedCount }
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Database className="size-4 text-primary" />
          <CardTitle className="text-sm">Server-managed env</CardTitle>
          <Badge variant="outline">{stageLabel(stage)}</Badge>
          {data?.updatedBy ? (
            <span className="text-[11px] text-muted-foreground">
              last edited by {data.updatedBy}
              {data.updatedAt ? ` · ${new Date(data.updatedAt).toLocaleDateString()}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            Stored encrypted and re-injected on every deploy, so these survive redeploys. On a key
            conflict a value here <span className="font-medium">overrides</span> the deployment’s
            env.json. Saving also applies the change live immediately.
            {canEdit ? " Use “Import live” to snapshot the current deployed values into a layer." : " You have read-only access."}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <LayerEditor
          title="Project-wide"
          initial={data?.project ?? {}}
          liveShared={projectShared}
          editable={canEdit}
          onSave={(env) => saveLayer({ stage, project: env })}
        />
        {multiGroup
          ? groups.map((group) => {
              const label = getGroupLabel(group)
              return (
                <LayerEditor
                  key={group}
                  title="Group"
                  badge={{ label, token: getGroupColorToken(label) }}
                  initial={data?.groups?.[group] ?? {}}
                  liveShared={sharedAcross(liveByGroup[group] ?? [])}
                  editable={canEdit}
                  onSave={(env) => saveLayer({ stage, groups: { [group]: env } })}
                />
              )
            })
          : null}
      </CardContent>
    </Card>
  )
}
