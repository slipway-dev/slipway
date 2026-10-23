"use client"

import { CircleX, FilePlus, Folder, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SLOT_IDS, type SlotId } from "@/features/parts/types"
import type { TaskFile } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { iconForPath, sameSelection, SECTIONS, slotForPath, type Selection } from "./slots"

interface Marks {
  errors: number
  warnings: number
}

function tally(issues: Issue[]): Marks {
  const errors = issues.filter((i) => i.severity === "error").length
  return { errors, warnings: issues.length - errors }
}

function IssueMark({ marks }: { marks: Marks }) {
  const t = useT()
  if (marks.errors) {
    return (
      <span className="flex items-center gap-1 text-fail" title={t.studio.checks.counts(marks.errors, marks.warnings)}>
        <CircleX className="size-3.5" aria-hidden />
        <span className="tabular-nums">{marks.errors}</span>
        <span className="sr-only">{t.studio.checks.error}</span>
      </span>
    )
  }
  if (marks.warnings) {
    return (
      <span className="flex items-center gap-1 text-warn" title={t.studio.checks.counts(0, marks.warnings)}>
        <TriangleAlert className="size-3.5" aria-hidden />
        <span className="tabular-nums">{marks.warnings}</span>
        <span className="sr-only">{t.studio.checks.warning}</span>
      </span>
    )
  }
  return null
}

interface RowProps {
  depth: number
  icon: React.ComponentType<{ className?: string }>
  name: string
  dim?: string
  active: boolean
  onClick: () => void
  trailing?: React.ReactNode
}

/**
 * One line of the folder; the active row carries an ink bar on its leading edge.
 */
function Row({ depth, icon: Icon, name, dim, active, onClick, trailing }: RowProps) {
  return (
    <li className="relative">
      {depth > 0 && <span aria-hidden className="absolute inset-y-0 left-[23px] w-px bg-line" />}
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={cn(
          "group relative flex h-8 w-full items-center gap-2 rounded-sm pr-2 text-left font-mono text-code text-ink",
          "hover:bg-surface focus-visible:z-10",
          active && "bg-surface font-semibold",
        )}
        style={{ paddingLeft: 16 + depth * 18 }}
      >
        {active && (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-ink"
          />
        )}
        <Icon className={cn("size-4 shrink-0", active ? "text-ink" : "text-ink-muted")} />
        <span className="min-w-0 flex-1 truncate">
          {dim && <span className="text-ink-muted">{dim}</span>}
          {name}
        </span>
        {trailing && (
          <span className="flex shrink-0 items-center gap-2 font-sans text-label normal-case">{trailing}</span>
        )}
      </button>
    </li>
  )
}

interface TaskTreeProps {
  project: TaskProject
  dirName: string
  files: TaskFile[]
  issues: Issue[]
  selection: Selection
  onSelect: (selection: Selection) => void
  onAddFile: () => void
}

/**
 * The task as the folder Launch writes. Slot folders open the part stack
 * that generates them; files open the file itself.
 */
export function TaskTree({ project, dirName, files, issues, selection, onSelect, onAddFile }: TaskTreeProps) {
  const t = useT()

  const fileMarks = (path: string) => tally(issues.filter((i) => i.path === path && !i.blockId))
  const slotMarks = (slot: SlotId) => {
    const ids = new Set(project.blocks[slot].map((b) => b.id))
    return tally(issues.filter((i) => i.blockId && ids.has(i.blockId)))
  }

  const fileRow = (file: TaskFile, depth: number, name: string, dim?: string) => {
    const sel: Selection =
      file.path === "task.toml"
        ? { kind: "settings" }
        : file.path === "instruction.md"
          ? { kind: "instruction" }
          : { kind: "file", path: file.path }
    return (
      <Row
        key={file.path}
        depth={depth}
        icon={iconForPath(file.path)}
        name={name}
        dim={dim}
        active={sameSelection(selection, sel)}
        onClick={() => onSelect(sel)}
        trailing={
          <>
            <IssueMark marks={fileMarks(file.path)} />
            {file.origin.kind === "override" && (
              <span className="text-tide">{file.replaces ? t.studio.tree.edited : t.studio.tree.yours}</span>
            )}
          </>
        }
      />
    )
  }

  const byPath = new Map(files.map((f) => [f.path, f]))
  const rootFiles = ["task.toml", "instruction.md"].flatMap((p) => byPath.get(p) ?? [])
  const others = files.filter((f) => !slotForPath(f.path) && !rootFiles.includes(f))

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between gap-2 pr-2 pl-4">
        <h2 className="flex min-w-0 items-center gap-2 font-mono text-code font-semibold">
          <Folder className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="truncate">{dirName}/</span>
        </h2>
        <Button variant="ghost" size="icon" className="size-7" onClick={onAddFile} title={t.studio.tree.addFile}>
          <FilePlus />
          <span className="sr-only">{t.studio.tree.addFile}</span>
        </Button>
      </div>
      <nav aria-label={t.studio.tree.label}>
        <ul className="flex flex-col">
          {rootFiles.map((file) => fileRow(file, 0, file.path))}
          {SLOT_IDS.map((slot) => {
            const dir = SECTIONS[slot].target
            const count = project.blocks[slot].filter((b) => !b.disabled).length
            const children = files.filter((f) => f.path.startsWith(dir))
            return [
              <Row
                key={slot}
                depth={0}
                icon={SECTIONS[slot].icon}
                name={dir}
                active={sameSelection(selection, { kind: "slot", slot })}
                onClick={() => onSelect({ kind: "slot", slot })}
                trailing={
                  <>
                    <IssueMark marks={slotMarks(slot)} />
                    <span className="text-ink-muted tabular-nums">{t.studio.tree.parts(count)}</span>
                  </>
                }
              />,
              ...children.map((file) => fileRow(file, 1, file.path.slice(dir.length))),
            ]
          })}
          {others.map((file) => {
            const cut = file.path.lastIndexOf("/") + 1
            return fileRow(file, 0, file.path.slice(cut), file.path.slice(0, cut))
          })}
        </ul>
      </nav>
    </div>
  )
}
