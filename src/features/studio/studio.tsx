"use client"

import { ArrowLeft, Rocket } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { SlipwayMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SLOT_IDS, type SlotId } from "@/features/parts/types"
import { buildTaskZip } from "@/features/task/archive"
import { composeTask } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import { lintTask } from "@/features/task/lint"
import { taskDirName, taskTitle, type TaskProject } from "@/features/task/model"
import { useHydrated, usePartLookup, useStudio } from "@/features/task/store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

import { BlockList } from "./block-list"
import { ChecksPanel } from "./checks-panel"
import { CodeEditor } from "./code-editor"
import { downloadBytes } from "./download"
import { FileTree } from "./file-tree"
import { FileView } from "./file-view"
import { SettingsForm } from "./settings-form"
import { SECTIONS, type Selection } from "./slots"

type MobileTab = "outline" | "edit" | "checks"

function Outline({
  project,
  selection,
  onSelect,
  issues,
  files,
}: {
  project: TaskProject
  selection: Selection
  onSelect: (selection: Selection) => void
  issues: Issue[]
  files: ReturnType<typeof composeTask>["files"]
}) {
  const setOverride = useStudio((s) => s.setOverride)
  const entries: { key: string; selection: Selection; meta: (typeof SECTIONS)[keyof typeof SECTIONS]; count?: number }[] = [
    { key: "instruction", selection: { kind: "instruction" }, meta: SECTIONS.instruction },
    ...SLOT_IDS.map((slot) => ({
      key: slot,
      selection: { kind: "slot", slot } as Selection,
      meta: SECTIONS[slot],
      count: project.blocks[slot].filter((b) => !b.disabled).length,
    })),
    { key: "settings", selection: { kind: "settings" }, meta: SECTIONS.settings },
  ]

  function isActive(entry: Selection) {
    if (entry.kind !== selection.kind) return false
    return entry.kind !== "slot" || (selection.kind === "slot" && entry.slot === selection.slot)
  }

  function errorsFor(entry: Selection): number {
    if (entry.kind !== "slot") return 0
    const ids = new Set(project.blocks[entry.slot].map((b) => b.id))
    return issues.filter((i) => i.severity === "error" && i.blockId && ids.has(i.blockId)).length
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <nav aria-label="Task sections">
        <ul className="flex flex-col gap-1">
          {entries.map(({ key, selection: entry, meta, count }) => {
            const Icon = meta.icon
            const errors = errorsFor(entry)
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  aria-current={isActive(entry) ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface",
                    isActive(entry) && "bg-surface ring-1 ring-line-strong",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{meta.label}</span>
                    <span className="truncate font-mono text-body-sm text-ink-muted">{meta.target}</span>
                  </span>
                  {errors > 0 ? (
                    <span className="text-body-sm font-semibold text-fail">✕ {errors}</span>
                  ) : count !== undefined ? (
                    <span className="text-body-sm text-ink-muted">{count}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <FileTree
        files={files}
        selection={selection}
        onSelect={onSelect}
        onAddFile={() => {
          const path = prompt("Path of the new file, relative to the task root", "environment/")
          const clean = path?.trim().replace(/^\/+/, "")
          if (!clean || clean.endsWith("/") || clean.split("/").includes("..")) return
          if (files.some((f) => f.path === clean)) {
            onSelect({ kind: "file", path: clean })
            return
          }
          setOverride(project.id, clean, { content: "", executable: clean.endsWith(".sh") })
          onSelect({ kind: "file", path: clean })
        }}
      />
    </div>
  )
}

function Editor({
  project,
  selection,
  onSelect,
  composed,
  issues,
  lookup,
}: {
  project: TaskProject
  selection: Selection
  onSelect: (selection: Selection) => void
  composed: ReturnType<typeof composeTask>
  issues: Issue[]
  lookup: ReturnType<typeof usePartLookup>
}) {
  const updateProject = useStudio((s) => s.updateProject)

  if (selection.kind === "file") {
    return (
      <div className="h-full p-4">
        <FileView
          project={project}
          path={selection.path}
          file={composed.files.find((f) => f.path === selection.path)}
          lookup={lookup}
          onSelect={onSelect}
        />
      </div>
    )
  }

  const key = selection.kind === "slot" ? selection.slot : selection.kind
  const meta = SECTIONS[key]
  const header = (
    <div className="flex flex-col gap-1">
      <h2 className="flex items-center gap-2 text-title font-semibold">
        <meta.icon className="size-5 text-ink-muted" aria-hidden />
        {meta.label}
        <span className="font-mono text-code font-normal text-ink-muted">{meta.target}</span>
      </h2>
      <p className="text-body-sm text-ink-muted">{meta.hint}</p>
    </div>
  )

  if (selection.kind === "instruction") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        {header}
        <CodeEditor
          label="instruction.md"
          value={project.instruction}
          language="markdown"
          lineWrapping
          className="min-h-80 flex-1"
          onChange={(value) => updateProject(project.id, (p) => void (p.instruction = value))}
        />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-4">
        {header}
        {selection.kind === "settings" ? (
          <SettingsForm project={project} />
        ) : (
          <BlockList project={project} slot={selection.slot} lookup={lookup} issues={issues} />
        )}
      </div>
    </ScrollArea>
  )
}

export function Studio({ id }: { id: string }) {
  const hydrated = useHydrated()
  const project = useStudio((s) => s.projects[id])
  const lookup = usePartLookup()
  const [selection, setSelection] = useState<Selection>({ kind: "slot", slot: "environment" })
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit")
  const wide = useMediaQuery("(min-width: 1024px)")

  const composed = useMemo(() => (project ? composeTask(project, lookup) : undefined), [project, lookup])
  const issues = useMemo(
    () => (project && composed ? lintTask(project, composed) : []),
    [project, composed],
  )

  if (!hydrated) {
    return <p className="p-4 text-body-sm text-ink-muted">Loading task…</p>
  }
  if (!project || !composed) {
    return (
      <div className="flex flex-col items-start gap-4 p-4">
        <p>This task is not saved in this browser.</p>
        <Button asChild variant="outline">
          <Link href="/studio">Back to your tasks</Link>
        </Button>
      </div>
    )
  }

  const dirName = taskDirName(project)

  function select(next: Selection) {
    setSelection(next)
    setMobileTab("edit")
  }

  function selectIssue(issue: Issue) {
    if (issue.blockId) {
      const slot = SLOT_IDS.find((s) => project!.blocks[s].some((b) => b.id === issue.blockId)) as SlotId
      select({ kind: "slot", slot })
      requestAnimationFrame(() =>
        document.getElementById(`block-${issue.blockId}`)?.scrollIntoView({ block: "nearest" }),
      )
    } else if (issue.path === "instruction.md") select({ kind: "instruction" })
    else if (issue.path === "task.toml" && issue.code !== "schema") select({ kind: "settings" })
    else if (issue.path) select({ kind: "file", path: issue.path })
  }

  function launch() {
    downloadBytes(buildTaskZip(dirName, composed!.files), `${dirName}.zip`)
    const errors = issues.filter((i) => i.severity === "error").length
    if (errors) toast.warning(`Launched ${dirName}.zip with ${errors} unresolved ${errors === 1 ? "error" : "errors"}.`)
    else toast.success(`Launched ${dirName}.zip`)
  }

  const outline = (
    <Outline project={project} selection={selection} onSelect={select} issues={issues} files={composed.files} />
  )
  const editor = (
    <Editor
      project={project}
      selection={selection}
      onSelect={select}
      composed={composed}
      issues={issues}
      lookup={lookup}
    />
  )
  const checks = (
    <div className="p-4">
      <ChecksPanel issues={issues} dirName={dirName} onSelectIssue={selectIssue} />
    </div>
  )

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2">
        <Link href="/studio" className="flex items-center gap-2 rounded-sm text-ink-muted hover:text-ink" aria-label="Back to your tasks">
          <ArrowLeft className="size-4" />
          <SlipwayMark className="size-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-mono text-code font-semibold">{taskTitle(project)}</h1>
        <Button onClick={launch}>
          <Rocket />
          Launch
        </Button>
      </header>

      {wide ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="22" minSize={220} className="bg-surface-sunken">
            <ScrollArea className="h-full">{outline}</ScrollArea>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="52" minSize={360} className="bg-paper">
            {editor}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="26" minSize={260} className="bg-paper">
            <ScrollArea className="h-full">{checks}</ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as MobileTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-4 mt-2 w-[calc(100%-2rem)]">
            <TabsTrigger value="outline">Task</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="checks">
              Checks
              {issues.some((i) => i.severity === "error") && <span className="text-fail">✕</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outline" className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken">
            {outline}
          </TabsContent>
          <TabsContent value="edit" className="min-h-0 flex-1">
            {editor}
          </TabsContent>
          <TabsContent value="checks" className="min-h-0 flex-1 overflow-y-auto">
            {checks}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
