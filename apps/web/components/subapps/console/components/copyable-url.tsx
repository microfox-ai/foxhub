"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

/** A URL/value that copies to the clipboard on click instead of navigating away. */
export function CopyableUrl({
  url,
  className,
}: {
  url?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  if (!url) return <>{"—"}</>
  return (
    <button
      type="button"
      title="Click to copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-primary hover:underline",
        className,
      )}
    >
      <span className="truncate">{url}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-60" />
      )}
    </button>
  )
}
