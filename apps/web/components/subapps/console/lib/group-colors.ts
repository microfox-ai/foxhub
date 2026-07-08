export type GroupColorToken = {
  bg: string
  border: string
  text: string
}

const LIGHT_GROUP_PALETTE: Array<{ bg: string; border: string }> = [
  { bg: "#fef3c7", border: "#fde68a" },
  { bg: "#ffedd5", border: "#fed7aa" },
  { bg: "#fee2e2", border: "#fecaca" },
  { bg: "#fce7f3", border: "#fbcfe8" },
  { bg: "#ede9fe", border: "#ddd6fe" },
  { bg: "#e0e7ff", border: "#c7d2fe" },
  { bg: "#dbeafe", border: "#bfdbfe" },
  { bg: "#e0f2fe", border: "#bae6fd" },
  { bg: "#cffafe", border: "#a5f3fc" },
  { bg: "#dcfce7", border: "#bbf7d0" },
  { bg: "#ecfccb", border: "#d9f99d" },
  { bg: "#f1f5f9", border: "#e2e8f0" },
]

function normalizeGroupName(group?: string): string {
  return (group || "default").trim().toLowerCase() || "default"
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "")
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return { r, g, b }
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const toLinear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function getGroupColorToken(group?: string): GroupColorToken {
  const normalized = normalizeGroupName(group)
  const palette = LIGHT_GROUP_PALETTE
  const index = hashString(normalized) % palette.length
  const picked = palette[index] ?? palette[0]!
  const text = relativeLuminance(picked.bg) > 0.66 ? "#111111" : "#ffffff"
  return { bg: picked.bg, border: picked.border, text }
}

export function getGroupLabel(group?: string): string {
  const normalized = normalizeGroupName(group)
  if (!normalized) return "default"
  return normalized
}
