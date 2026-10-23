"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

interface TextBlockProps {
  text: string
  /** Lines shown before "Show all". */
  maxLines?: number
  mono?: boolean
  /** Render on hull, the brand's code surface. */
  code?: boolean
  className?: string
}

/** Long agent output, collapsed by default. Rendered as text, never as HTML. */
export function TextBlock({ text, maxLines = 14, mono = false, code = false, className }: TextBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split("\n")
  const long = lines.length > maxLines || text.length > maxLines * 160
  const shown = expanded || !long ? text : lines.slice(0, maxLines).join("\n").slice(0, maxLines * 160)

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <pre
        className={cn(
          "w-full overflow-x-auto break-words whitespace-pre-wrap",
          mono || code ? "font-mono text-code" : "font-sans text-body",
          code && "rounded-md bg-hull p-3 text-hull-ink",
        )}
      >
        {shown}
        {!expanded && long && <span className={code ? "text-hull-muted" : "text-ink-muted"}>…</span>}
      </pre>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-sm text-body-sm text-tide underline-offset-4 hover:underline"
        >
          {expanded ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  )
}
