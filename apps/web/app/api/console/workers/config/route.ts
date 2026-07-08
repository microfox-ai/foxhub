import { NextRequest, NextResponse } from "next/server"
import { resolveWorkerScope, resolveWorkersApiKey } from "../worker-scope"

/**
 * GET /api/console/workers/config?projectId=...
 *
 * Returns the RAW response of the core group's `GET /workers/config` call, verbatim, so the user
 * can inspect exactly what the deployed endpoint reports (queue URLs, schemas, regions, debug
 * errors). This is the "show me the direct API call" escape hatch — the catalog route massages
 * this same data into a friendlier shape. The worker-endpoint key is resolved server-side.
 */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || ""
  const scope = await resolveWorkerScope(projectId)
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

  if (!scope.agentBaseUrl) {
    return NextResponse.json(
      { error: "This project has no deployed core worker endpoint yet" },
      { status: 409 },
    )
  }

  const { key, source } = await resolveWorkersApiKey(projectId, scope.accessToken)
  // `?debug=1` surfaces the endpoint's attempted queue names + raw AWS errors (only when keyed).
  const url = `${scope.agentBaseUrl}/workers/config?debug=1`

  let upstream: Response
  try {
    const headers: Record<string, string> = {}
    if (key) headers["x-workers-config-key"] = key
    upstream = await fetch(url, { method: "GET", headers, cache: "no-store" })
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to reach /workers/config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    )
  }

  const text = await upstream.text()
  let config: unknown
  try {
    config = JSON.parse(text)
  } catch {
    config = text
  }

  return NextResponse.json({
    url: `${scope.agentBaseUrl}/workers/config`,
    status: upstream.status,
    ok: upstream.ok,
    keySource: source,
    config,
  })
}
