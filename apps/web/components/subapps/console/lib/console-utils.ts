const STAGE_TOKENS = ["prod", "dev", "staging", "test", "uat"]

/**
 * Beautifies a raw Lambda function name for display.
 * - The deployed name is `{service}[-{group}]-{stage}-{fnKey}`, where `fnKey` is the last
 *   dash-segment (camelCase, e.g. `workerDemo`). We take that last segment.
 * - IMPORTANT: a deployment GROUP can be named the same as a stage token (e.g. a group literally
 *   called "test"), so we must NOT key off the *first* stage token — that would mistake the group
 *   for the stage and return the real stage as the name (e.g. "test" group → "Prod"). We scan for
 *   the *rightmost* stage token that still has a segment after it (the real stage), and take that.
 * - Converts camelCase to space-separated and capitalizes each word.
 * e.g. "p-4f3605630f8c489-prod-queueStartercostusage" -> "Queue Startercostusage"
 *      "p-abc-test-prod-workerDemo" (group "test") -> "Worker Demo"
 */
export function beautifyFunctionName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return rawName
  const parts = rawName.split("-")
  // Rightmost stage token that isn't the final segment → the actual deployment stage.
  let stageIdx = -1
  for (let i = parts.length - 2; i >= 0; i -= 1) {
    if (STAGE_TOKENS.includes((parts[i] ?? "").toLowerCase())) {
      stageIdx = i
      break
    }
  }
  const logicalPart =
    stageIdx >= 0 ? parts[stageIdx + 1] : parts[parts.length - 1] ?? rawName
  const spaced = logicalPart?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? ""
  return spaced
    .split(" ")
    .map((w) => (w.length ? w[0]?.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}
