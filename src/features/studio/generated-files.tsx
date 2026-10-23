"use client"

import { ArrowUpRight } from "lucide-react"
import { useState } from "react"

import type { TaskFile } from "@/features/task/compose"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { CodeEditor, languageFor } from "./code-editor"
import type { Selection } from "./slots"

interface GeneratedFilesProps {
  files: TaskFile[]
  onSelect: (selection: Selection) => void
}

/**
 * Read-only view of what the section on the left writes, so a parameter
 * change shows up in the Dockerfile or test script as it is typed.
 */
export function GeneratedFiles({ files, onSelect }: GeneratedFilesProps) {
  const t = useT()
  const [picked, setPicked] = useState<string>()
  const current = files.find((f) => f.path === picked) ?? files[0]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-hull text-hull-ink">
      <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-white/10 px-3">
        <span className="shrink-0 px-2 text-label text-hull-muted">{t.studio.generated}</span>
        <div role="tablist" className="flex min-w-0 items-center">
          {files.map((file) => (
            <button
              key={file.path}
              type="button"
              role="tab"
              aria-selected={file === current}
              onClick={() => setPicked(file.path)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 font-mono text-code text-hull-muted hover:text-hull-ink",
                file === current && "bg-white/10 text-hull-ink",
              )}
            >
              {file.path}
            </button>
          ))}
        </div>
        {current && current.encoding !== "base64" && (
          <button
            type="button"
            onClick={() => onSelect({ kind: "file", path: current.path })}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-body-sm text-hull-tide hover:underline"
          >
            {t.studio.file.open}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      {!current ? (
        <p className="p-4 text-body-sm text-hull-muted">{t.studio.generatedEmpty}</p>
      ) : current.encoding === "base64" ? (
        <p className="p-4 text-body-sm text-hull-muted">
          {t.studio.file.binary(Math.round((current.content.length * 3) / 4 / 1024))}
        </p>
      ) : (
        <CodeEditor
          key={current.path}
          label={current.path}
          value={current.content}
          language={languageFor(current.path)}
          readOnly
          className="min-h-0 flex-1 rounded-none"
        />
      )}
    </div>
  )
}
