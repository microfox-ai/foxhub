"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { WorkerJobNode } from "@/components/subapps/console/lib/console-api"
import {
  STATUS_META,
  isTerminal,
  formatDuration,
  firstAwaitingJobId,
  MAX_RUN_NODES,
  StatusPill,
  DispatchBadge,
  ApprovalBadge,
  NodeDetailPanel,
  walkTree,
} from "@/components/subapps/console/components/worker-run-shared"
import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"

// --- graph building --------------------------------------------------------

const NODE_W = 230
const NODE_H = 74
const H_GAP = 36
const V_GAP = 140

type FlowNodeData = {
  node: WorkerJobNode
  isRoot: boolean
  selected: boolean
  onPath: boolean
}

/** Flatten the job tree into maps + a tidy top-down layout. Cycle-guarded + node-capped so a
 * malformed/runaway tree can't recurse forever or render thousands of nodes (which hung the tab). */
function buildGraph(root: WorkerJobNode) {
  const byId = new Map<string, WorkerJobNode>()
  const parentOf = new Map<string, string | null>()
  const pos = new Map<string, { x: number; y: number }>()
  let nextLeafX = 0
  const seen = new Set<string>()
  let count = 0
  let truncated = false

  const layout = (n: WorkerJobNode, depth: number, parent: string | null): number => {
    // Cycle / shared-node guard + hard cap. Already-placed or over-cap nodes get the current leaf
    // slot without recursing, so x-computation still returns a finite number.
    if ((n.jobId && seen.has(n.jobId)) || count >= MAX_RUN_NODES) {
      truncated = truncated || count >= MAX_RUN_NODES
      return nextLeafX
    }
    if (n.jobId) seen.add(n.jobId)
    count += 1
    byId.set(n.jobId, n)
    parentOf.set(n.jobId, parent)
    const kids = (n.children ?? []).filter((c) => !(c.jobId && seen.has(c.jobId)))
    let x: number
    if (!kids.length) {
      x = nextLeafX
      nextLeafX += NODE_W + H_GAP
    } else {
      const xs = kids.map((c) => layout(c, depth + 1, n.jobId))
      x = (xs[0]! + xs[xs.length - 1]!) / 2
    }
    pos.set(n.jobId, { x, y: depth * V_GAP })
    return x
  }
  layout(root, 0, null)
  if (truncated && process.env.NODE_ENV !== "production") {
    console.warn(`[run-flow] tree truncated at ${MAX_RUN_NODES} nodes`)
  }

  const ancestorsOf = (jobId: string): string[] => {
    const chain: string[] = []
    let cur: string | null | undefined = jobId
    while (cur) {
      chain.unshift(cur)
      cur = parentOf.get(cur) ?? null
    }
    return chain
  }

  return { byId, parentOf, pos, ancestorsOf }
}

// --- custom node -----------------------------------------------------------

function WorkerFlowNode({ data }: NodeProps) {
  const d = data as unknown as FlowNodeData
  const { node, isRoot, selected, onPath } = d
  const meta = STATUS_META[node.status]
  const duration = formatDuration(node)
  const childCount = node.children.length

  return (
    <div
      className={`rounded-lg border bg-card px-3 py-2 shadow-sm transition-all ${
        selected
          ? "ring-2 ring-primary"
          : onPath
            ? "ring-1 ring-primary/40"
            : "hover:shadow-md"
      }`}
      style={{ width: NODE_W, borderLeft: `4px solid ${meta.border}` }}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-muted-foreground/50" />
      <div className="flex items-center gap-1.5">
        {isRoot && <Crown className="size-3.5 shrink-0 text-amber-500" />}
        <span className="truncate text-sm font-semibold">{node.workerId || "(worker)"}</span>
        {childCount > 0 && (
          <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1.5 text-[10px]">
            {childCount}
          </Badge>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <StatusPill status={node.status} />
        {duration && <span className="font-mono text-[10px] text-muted-foreground">{duration}</span>}
      </div>
      {node.awaitingApproval && (
        <div className="mt-1">
          <ApprovalBadge />
        </div>
      )}
      {node.awaited !== undefined && (
        <div className="mt-1">
          <DispatchBadge awaited={node.awaited} delaySeconds={node.delaySeconds} />
        </div>
      )}
      {isRoot && (
        <div className="mt-1 text-[9px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Final output
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-muted-foreground/50" />
    </div>
  )
}

const nodeTypes = { worker: WorkerFlowNode }

// --- canvas + detail panel -------------------------------------------------

function Flow({ root, projectId }: { root: WorkerJobNode; projectId: string }) {
  const { fitView } = useReactFlow()
  // Focus the HITL step by default so the reviewer form is visible immediately (else the root).
  const [selectedId, setSelectedId] = useState<string>(() => firstAwaitingJobId(root) ?? root.jobId)

  const { byId, pos, ancestorsOf } = useMemo(() => buildGraph(root), [root])

  // Keep selection valid as the tree grows/changes, and auto-jump to the
  // awaiting-approval node so the reviewer panel surfaces without a manual click.
  useEffect(() => {
    if (!byId.has(selectedId)) {
      setSelectedId(root.jobId)
      return
    }
    // If the currently-selected node is NOT already an awaiting node, look for one.
    const current = byId.get(selectedId)
    if (current?.awaitingApproval) return
    let hitlId: string | null = null
    walkTree(root, (n) => {
      if (!hitlId && n.awaitingApproval) hitlId = n.jobId
    })
    if (hitlId) setSelectedId(hitlId)
  }, [byId, selectedId, root.jobId, root])

  const ancestors = useMemo(() => new Set(ancestorsOf(selectedId)), [ancestorsOf, selectedId])

  const rfNodes: Node[] = useMemo(() => {
    const out: Node[] = []
    for (const [jobId, node] of byId) {
      const p = pos.get(jobId) ?? { x: 0, y: 0 }
      out.push({
        id: jobId,
        type: "worker",
        position: p,
        data: {
          node,
          isRoot: jobId === root.jobId,
          selected: jobId === selectedId,
          onPath: ancestors.has(jobId),
        } satisfies FlowNodeData as unknown as Record<string, unknown>,
        draggable: false,
      })
    }
    return out
  }, [byId, pos, root.jobId, selectedId, ancestors])

  const rfEdges: Edge[] = useMemo(() => {
    const out: Edge[] = []
    for (const [jobId, node] of byId) {
      for (const child of node.children) {
        const onPath = ancestors.has(jobId) && ancestors.has(child.jobId)
        const active = !isTerminal(child.status)
        // Fire-and-forget dispatches get a dashed edge; awaited ones stay solid.
        const fireAndForget = child.awaited === false
        out.push({
          id: `${jobId}->${child.jobId}`,
          source: jobId,
          target: child.jobId,
          type: "smoothstep",
          animated: active,
          label: child.awaited === false ? "dispatch" : child.awaited ? "await" : undefined,
          labelStyle: { fontSize: 9, fill: "#64748b" },
          labelBgStyle: { fill: "transparent" },
          style: {
            stroke: onPath ? "var(--primary, #6366f1)" : "#94a3b8",
            strokeWidth: onPath ? 2.5 : 1.5,
            strokeDasharray: fireAndForget ? "5 4" : undefined,
          },
        })
      }
    }
    return out
  }, [byId, ancestors])

  // Re-fit when the node count changes (new children discovered).
  const prevCount = useRef(0)
  useEffect(() => {
    if (rfNodes.length !== prevCount.current) {
      prevCount.current = rfNodes.length
      const t = setTimeout(() => fitView({ duration: 400, padding: 0.25 }), 60)
      return () => clearTimeout(t)
    }
  }, [rfNodes.length, fitView])

  const selectedNode = byId.get(selectedId)
  const trace = useMemo(
    () => ancestorsOf(selectedId).map((id) => byId.get(id)).filter(Boolean) as WorkerJobNode[],
    [ancestorsOf, selectedId, byId],
  )

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <div className="h-[560px] overflow-hidden rounded-lg border bg-muted/20">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={(n) => STATUS_META[(n.data as unknown as FlowNodeData).node.status].border}
            className="!bg-background"
          />
        </ReactFlow>
      </div>

      {selectedNode ? (
        <NodeDetailPanel
          projectId={projectId}
          node={selectedNode}
          trace={trace}
          isRoot={selectedNode.jobId === root.jobId}
          onSelect={setSelectedId}
        />
      ) : null}
    </div>
  )
}

export function WorkerRunFlow({ root, projectId }: { root: WorkerJobNode; projectId: string }) {
  return (
    <ReactFlowProvider>
      <Flow root={root} projectId={projectId} />
    </ReactFlowProvider>
  )
}
