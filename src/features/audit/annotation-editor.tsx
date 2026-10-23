"use client"

import { useState } from "react"

import { Textarea } from "@/components/ui/textarea"
import { useRuns } from "@/features/runs/store"
import { cn } from "@/lib/utils"

import { VERDICTS } from "./status"

/** A reviewer's verdict and note on one step or trial, saved in this browser. */
export function AnnotationEditor({ annotationKey, compact = false }: { annotationKey: string; compact?: boolean }) {
  const annotation = useRuns((s) => s.annotations[annotationKey])
  const setAnnotation = useRuns((s) => s.setAnnotation)
  const [editing, setEditing] = useState(false)
  const note = annotation?.note ?? ""

  return (
    <div className={cn("flex flex-col gap-2", compact && "text-body-sm")}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Verdict">
        {VERDICTS.map((v) => {
          const active = annotation?.verdict === v.value
          return (
            <button
              key={v.value}
              type="button"
              aria-pressed={active}
              onClick={() => setAnnotation(annotationKey, { note, verdict: active ? undefined : v.value })}
              className={cn(
                "rounded-sm border px-2 py-0.5 text-body-sm",
                active ? cn("border-current font-semibold", v.className) : "border-line-strong text-ink-muted hover:text-ink",
              )}
            >
              {v.label}
            </button>
          )
        })}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-sm text-body-sm text-tide underline-offset-4 hover:underline"
          >
            {note ? "Edit note" : "Add note"}
          </button>
        )}
      </div>
      {editing ? (
        <Textarea
          autoFocus
          aria-label="Note"
          defaultValue={note}
          placeholder="What did you notice?"
          onBlur={(e) => {
            setAnnotation(annotationKey, { verdict: annotation?.verdict, note: e.target.value })
            setEditing(false)
          }}
        />
      ) : (
        note && <p className="text-body-sm whitespace-pre-wrap">{note}</p>
      )}
    </div>
  )
}
