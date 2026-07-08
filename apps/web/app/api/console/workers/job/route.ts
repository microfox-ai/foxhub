import { NextRequest, NextResponse } from "next/server"
import {
  resolveWorkerScope,
  fetchProjectEnvMerged,
  resolveJobStoreConfig,
} from "../worker-scope"
import { loadJobTree, type JobNode } from "../job-store"

/**
 * POST /api/console/workers/job
 *
 * Returns the *final* result of a worker run (status + output), not just the trigger ack — read
 * straight from the project's job store, plus the full `dispatchWorker` child tree. This is the
 * console analogue of the boilerplate's `GET /api/workflows/workers/:workerId/:jobId` (which reads
 * the same store), so the console can poll a run to completion.
 *
 * Body: { projectId, jobId, workerId?, tree? (default true) }
 *
 * Reading the store needs its credentials, which live in the deployed env — so this requires
 * `env.view` (in addition to `workers.view`). Without it we return `available:false` so the UI can
 * explain why the output isn't shown.
 */

type Body = { projectId?: string; jobId?: string; workerId?: string; tree?: boolean }

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const jobId = (body.jobId || "").trim()
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 })

  const scope = await resolveWorkerScope((body.projectId || "").trim())
  if (!scope.ok) return scope.response

  if (
    !scope.can("workers.view") &&
    !scope.can("deployment.view") &&
    !scope.can("observability.view")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view workers for this project" },
      { status: 403 },
    )
  }

  // The job store lives behind the project's own DB creds (in the deployed env).
  const env = await fetchProjectEnvMerged(body.projectId!.trim(), scope.accessToken)
  if (!env) {
    return NextResponse.json({
      available: false,
      reason: "env_access_required",
      message:
        "Reading worker output needs the project's job-store credentials (env access). You need the env.view permission.",
    })
  }

  const cfg = resolveJobStoreConfig(env)
  if (cfg.type === "none") {
    return NextResponse.json({
      available: false,
      reason: "no_job_store",
      message:
        "No worker job store is configured for this project (set WORKER_UPSTASH_REDIS_* or MONGODB_* env), so status/output can't be read.",
    })
  }

  try {
    const root: JobNode = await loadJobTree(cfg, jobId, body.workerId || "")
    return NextResponse.json({ available: true, storeType: cfg.type, root })
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read job store: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    )
  }
}
