"use client"

import { Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PartLookup } from "@/features/parts/registry"
import { MANAGED_PATHS, type FileOrigin, type TaskFile } from "@/features/task/compose"
import type { TaskProject } from "@/features/task/model"
import { useStudio } from "@/features/task/store"

import { CodeEditor, languageFor } from "./code-editor"
import type { Selection } from "./slots"

function describeOrigin(origin: FileOrigin, lookup: PartLookup): string {
  if (origin.kind === "part") return `From the ${lookup(origin.partId)?.name ?? origin.partId} part`
  if (origin.kind === "override") return "Written by you"
  return {
    config: "Generated from task settings and parts",
    instruction: "Written in Instruction",
    dockerfile: "Generated from environment parts",
  }[origin.by]
}

interface FileViewProps {
  project: TaskProject
  file: TaskFile | undefined
  path: string
  lookup: PartLookup
  onSelect: (selection: Selection) => void
}

export function FileView({ project, file, path, lookup, onSelect }: FileViewProps) {
  const setOverride = useStudio((s) => s.setOverride)
  const removeOverride = useStudio((s) => s.removeOverride)

  if (!file) {
    return <p className="text-body-sm text-ink-muted">{path} is no longer part of this task.</p>
  }

  const managed = MANAGED_PATHS.includes(path)
  const editable = file.origin.kind === "override"

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate font-mono text-code font-semibold">{path}</h2>
          <p className="text-body-sm text-ink-muted">
            {file.replaces
              ? `Edited by you; replaces what ${describeOrigin(file.replaces, lookup).toLowerCase()} would write`
              : describeOrigin(file.origin, lookup)}
            {file.executable && " · executable"}
          </p>
        </div>
        {managed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(path === "task.toml" ? { kind: "settings" } : { kind: "instruction" })}
          >
            <Pencil />
            Edit in {path === "task.toml" ? "Task settings" : "Instruction"}
          </Button>
        ) : editable ? (
          file.replaces ? (
            <Button variant="outline" size="sm" onClick={() => removeOverride(project.id, path)}>
              <RotateCcw />
              Revert to generated
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${path}?`)) removeOverride(project.id, path)
              }}
            >
              <Trash2 />
              Delete file
            </Button>
          )
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setOverride(project.id, path, { content: file.content, executable: file.executable })
            }
          >
            <Pencil />
            Edit by hand
          </Button>
        )}
      </div>
      {!editable && !managed && (
        <p className="text-body-sm text-ink-muted">
          Editing by hand stops parts from updating this file until you revert it.
        </p>
      )}
      <CodeEditor
        key={path + String(editable)}
        label={path}
        value={file.content}
        language={languageFor(path)}
        readOnly={!editable}
        className="min-h-0 flex-1"
        onChange={(content) =>
          setOverride(project.id, path, { content, executable: file.executable })
        }
      />
    </div>
  )
}
