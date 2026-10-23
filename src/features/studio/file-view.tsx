"use client"

import { Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { PartLookup } from "@/features/parts/registry"
import { MANAGED_PATHS, type FileOrigin, type TaskFile } from "@/features/task/compose"
import type { TaskProject } from "@/features/task/model"
import { useStudio } from "@/features/task/store"
import type { Messages } from "@/i18n/messages"
import { useT } from "@/i18n/provider"
import { partText } from "@/i18n/text"

import { CodeEditor, languageFor } from "./code-editor"
import type { Selection } from "./slots"

function describeOrigin(t: Messages, origin: FileOrigin, lookup: PartLookup): string {
  if (origin.kind === "part") {
    const part = lookup(origin.partId)
    return t.studio.file.fromPart(part ? partText(t, part).name : origin.partId)
  }
  if (origin.kind === "override") return t.studio.file.writtenByYou
  return {
    config: t.studio.file.fromConfig,
    instruction: t.studio.file.fromInstruction,
    dockerfile: t.studio.file.fromDockerfile,
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
  const t = useT()
  const f = t.studio.file
  const setOverride = useStudio((s) => s.setOverride)
  const removeOverride = useStudio((s) => s.removeOverride)

  if (!file) {
    return <p className="text-body-sm text-ink-muted">{f.gone(path)}</p>
  }

  const managed = MANAGED_PATHS.includes(path)
  const binary = file.encoding === "base64"
  const editable = file.origin.kind === "override" && !binary

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate font-mono text-code font-semibold">{path}</h2>
          <p className="text-body-sm text-ink-muted">
            {file.replaces
              ? f.replaces(describeOrigin(t, file.replaces, lookup))
              : describeOrigin(t, file.origin, lookup)}
            {file.executable && ` · ${f.executable}`}
          </p>
        </div>
        {managed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect(path === "task.toml" ? { kind: "settings" } : { kind: "instruction" })}
          >
            <Pencil />
            {f.editIn(t.studio.sections[path === "task.toml" ? "settings" : "instruction"].label)}
          </Button>
        ) : file.origin.kind === "override" ? (
          file.replaces ? (
            <Button variant="outline" size="sm" onClick={() => removeOverride(project.id, path)}>
              <RotateCcw />
              {f.revert}
            </Button>
          ) : (
            <ConfirmDialog
              title={f.confirmDelete(path)}
              confirmLabel={t.common.delete}
              onConfirm={() => removeOverride(project.id, path)}
            >
              <Button
                variant="outline"
                size="sm"
              >
                <Trash2 />
                {f.deleteFile}
              </Button>
            </ConfirmDialog>
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
            {f.editByHand}
          </Button>
        )}
      </div>
      {!editable && !managed && (
        <p className="text-body-sm text-ink-muted">
          {f.handEditNote}
        </p>
      )}
      {binary ? (
        <p className="rounded-md border border-line bg-surface p-4 text-body-sm">
          {f.binary(Math.round((file.content.length * 3) / 4 / 1024))}
        </p>
      ) : (
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
      )}
    </div>
  )
}
