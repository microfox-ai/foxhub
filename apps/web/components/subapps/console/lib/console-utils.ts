const STAGE_TOKENS = ["prod", "dev", "staging", "test", "uat"]

/**
 * Beautifies a raw Lambda function name for display.
 * - Splits by `-`, finds stage token (prod/dev/staging/test/uat), takes segment after it
 * - Converts camelCase to space-separated and capitalizes each word
 * e.g. "p-4f3605630f8c489-prod-queueStartercostusage" -> "Queue Starter Costusage"
 */
export function beautifyFunctionName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return rawName
  const parts = rawName.split("-")
  const stageIdx = parts.findIndex((p) => STAGE_TOKENS.includes(p.toLowerCase()))
  const logicalPart =
    stageIdx >= 0 && stageIdx < parts.length - 1 ? parts[stageIdx + 1] : parts[parts.length - 1] ?? rawName
  const spaced = logicalPart?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? ""
  return spaced
    .split(" ")
    .map((w) => (w.length ? w[0]?.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}
