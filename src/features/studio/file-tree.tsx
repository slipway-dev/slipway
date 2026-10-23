"use client"

import { FilePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TaskFile } from "@/features/task/compose"
import { cn } from "@/lib/utils"

import { iconForPath, type Selection } from "./slots"

interface FileTreeProps {
  files: TaskFile[]
  selection: Selection
  onSelect: (selection: Selection) => void
  onAddFile: () => void
}

/** The Launch output, file by file; marks the files an author wrote or edited by hand. */
export function FileTree({ files, selection, onSelect, onAddFile }: FileTreeProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-label uppercase text-ink-muted">Files</h2>
        <Button variant="ghost" size="sm" onClick={onAddFile}>
          <FilePlus />
          Add
        </Button>
      </div>
      <ul className="flex flex-col">
        {files.map((file) => {
          const Icon = iconForPath(file.path)
          const parts = file.path.split("/")
          const name = parts.pop()!
          const dir = parts.length ? parts.join("/") + "/" : ""
          const active = selection.kind === "file" && selection.path === file.path
          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => onSelect({ kind: "file", path: file.path })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left font-mono text-code hover:bg-surface",
                  active && "bg-surface font-semibold",
                )}
              >
                <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 truncate">
                  <span className="text-ink-muted">{dir}</span>
                  {name}
                </span>
                {file.origin.kind === "override" && (
                  <span className="ml-auto shrink-0 font-sans text-label uppercase text-tide">
                    {file.replaces ? "edited" : "yours"}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
