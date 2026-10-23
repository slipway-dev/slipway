"use client"

import { ArrowLeft, Rocket } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { SlipwayMark } from "@/components/brand/logo"
import { LocaleSwitch } from "@/components/locale-switch"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SLOT_IDS, type SlotId } from "@/features/parts/types"
import { buildTaskZip } from "@/features/task/archive"
import { composeTask, type TaskFile } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import { lintTask } from "@/features/task/lint"
import { taskDirName, taskTitle, type TaskProject } from "@/features/task/model"
import { useHydrated, usePartLookup, useStudio } from "@/features/task/store"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useT } from "@/i18n/provider"
import { simulateTask } from "@/features/task/simulate"

import { Blueprint } from "./blueprint/blueprint"
import { CheckBar, ChecksPanel } from "./check-bar"
import { CodeEditor } from "./code-editor"
import { downloadBytes } from "./download"
import { FileView } from "./file-view"
import type { SectionKey, Selection } from "./slots"
import { TaskTree } from "./task-tree"
import { SimBadge, ViewSwitch, type ViewMode } from "./view-switch"
import { Workbench } from "./workbench/workbench"
import { NewFileDialog } from "./new-file-dialog"

type MobileTab = "files" | "edit" | "checks"

/** Blueprint, the workbench of one part, or the source files. */
type View =
  | { mode: "blueprint" }
  | { mode: "bench"; part: SectionKey }
  | { mode: "source"; selection: Selection }

/** The source layer: the raw instruction and every file the task is made of. */
function Canvas({
  project,
  selection,
  onSelect,
  files,
  lookup,
}: {
  project: TaskProject
  selection: Selection
  onSelect: (selection: Selection) => void
  files: TaskFile[]
  lookup: ReturnType<typeof usePartLookup>
}) {
  const updateProject = useStudio((s) => s.updateProject)

  if (selection.kind === "file") {
    return (
      <div className="h-full p-4 lg:p-8">
        <FileView
          project={project}
          path={selection.path}
          file={files.find((f) => f.path === selection.path)}
          lookup={lookup}
          onSelect={onSelect}
        />
      </div>
    )
  }

  if (selection.kind === "instruction") {
    return (
      <div className="flex h-full min-h-0 flex-col p-4 lg:p-8">
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

  return null
}

export function Studio({ id }: { id: string }) {
  const t = useT()
  const hydrated = useHydrated()
  const project = useStudio((s) => s.projects[id])
  const setOverride = useStudio((s) => s.setOverride)
  const lookup = usePartLookup()
  const [view, setView] = useState<View>({ mode: "blueprint" })
  const [played, setPlayed] = useState(false)
  const selection: Selection =
    view.mode === "source"
      ? view.selection
      : view.mode === "bench"
        ? view.part === "instruction"
          ? { kind: "instruction" }
          : view.part === "settings"
            ? { kind: "settings" }
            : { kind: "slot", slot: view.part }
        : { kind: "instruction" }
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit")
  const [newFileOpen, setNewFileOpen] = useState(false)
  const wide = useMediaQuery("(min-width: 1024px)")

  const composed = useMemo(() => (project ? composeTask(project, lookup) : undefined), [project, lookup])
  const issues = useMemo(
    () => (project && composed ? lintTask(project, composed) : []),
    [project, composed],
  )
  const simulation = useMemo(() => (project ? simulateTask(project, lookup) : undefined), [project, lookup])

  if (!hydrated) {
    return <p className="p-4 text-body-sm text-ink-muted">{t.studio.loading}</p>
  }
  if (!project || !composed || !simulation) {
    return (
      <div className="flex flex-col items-start gap-4 p-4">
        <p>{t.studio.notSaved}</p>
        <Button asChild variant="outline">
          <Link href="/studio">{t.studio.backToTasks}</Link>
        </Button>
      </div>
    )
  }

  const dirName = taskDirName(project)

  /** Sections open their workbench; files and the raw instruction open the source. */
  function select(next: Selection) {
    if (next.kind === "slot") setView({ mode: "bench", part: next.slot })
    else if (next.kind === "settings") setView({ mode: "bench", part: "settings" })
    else setView({ mode: "source", selection: next })
    setMobileTab("edit")
  }

  function switchView(mode: ViewMode) {
    if (mode === "blueprint") setView({ mode: "blueprint" })
    else setView({ mode: "source", selection: selection.kind === "file" ? selection : { kind: "instruction" } })
  }

  function selectIssue(issue: Issue) {
    if (issue.blockId) {
      const slot = SLOT_IDS.find((s) => project!.blocks[s].some((b) => b.id === issue.blockId)) as SlotId
      select({ kind: "slot", slot })
      requestAnimationFrame(() =>
        document.getElementById(`block-${issue.blockId}`)?.scrollIntoView({ block: "nearest" }),
      )
    } else if (issue.path === "instruction.md") select({ kind: "instruction" })
    else if (issue.path === "task.toml") select({ kind: "settings" })
    else if (issue.path) select({ kind: "file", path: issue.path })
  }

  function addFile(clean: string) {
    if (!composed!.files.some((f) => f.path === clean)) {
      setOverride(project!.id, clean, { content: "", executable: clean.endsWith(".sh") })
    }
    select({ kind: "file", path: clean })
  }

  function launch() {
    const file = `${dirName}.zip`
    downloadBytes(buildTaskZip(dirName, composed!.files), file)
    const errors = issues.filter((i) => i.severity === "error").length
    if (errors) toast.warning(t.studio.launchedWithErrors(file, errors))
    else toast.success(t.studio.launched(file))
  }

  const tree = (
    <TaskTree
      project={project}
      dirName={dirName}
      files={composed.files}
      issues={issues}
      selection={selection}
      onSelect={select}
      onAddFile={() => setNewFileOpen(true)}
    />
  )
  const canvas = (
    <Canvas
      project={project}
      selection={selection}
      onSelect={select}
      files={composed.files}
      lookup={lookup}
    />
  )
  const errorCount = issues.filter((i) => i.severity === "error").length

  return (
    <div className="flex h-dvh flex-col">
      <NewFileDialog open={newFileOpen} onOpenChange={setNewFileOpen} onCreate={addFile} />
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-2 lg:px-5 lg:py-0">
        <Link
          href="/studio"
          className="flex items-center gap-1.5 rounded-sm p-1 text-ink-muted hover:text-ink"
          aria-label={t.studio.backToTasks}
          title={t.studio.backToTasks}
        >
          <ArrowLeft className="size-4" />
          <SlipwayMark className="size-6" />
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <h1 className="min-w-0 flex-1 truncate font-mono text-code font-semibold">{taskTitle(project)}</h1>
        <SimBadge simulation={simulation} />
        {/* On a narrow screen the switch gets a row of its own below the title. */}
        <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
          <ViewSwitch active={view.mode === "source" ? "source" : "blueprint"} onChange={switchView} />
        </div>
        <LocaleSwitch />
        <Button variant="signal" onClick={launch}>
          <Rocket />
          {t.studio.launch}
        </Button>
      </header>

      {view.mode === "blueprint" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-paper">
          <Blueprint
            project={project}
            files={composed.files}
            issues={issues}
            simulation={simulation}
            lookup={lookup}
            dirName={dirName}
            animate={!played}
            onPlayed={() => setPlayed(true)}
            onOpen={(part) => setView({ mode: "bench", part })}
          />
        </div>
      ) : view.mode === "bench" ? (
        <div className="min-h-0 flex-1 bg-paper">
          <Workbench
            part={view.part}
            project={project}
            files={composed.files}
            issues={issues}
            simulation={simulation}
            lookup={lookup}
            dirName={dirName}
            wide={wide}
            onBack={() => setView({ mode: "blueprint" })}
            onSource={select}
          />
        </div>
      ) : wide ? (
        <>
          <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize="20" minSize={240} maxSize={480} className="bg-surface-sunken">
              <ScrollArea className="h-full">{tree}</ScrollArea>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="80" minSize={600} className="bg-paper">
              {canvas}
            </ResizablePanel>
          </ResizablePanelGroup>
          <CheckBar issues={issues} dirName={dirName} onSelectIssue={selectIssue} />
        </>
      ) : (
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as MobileTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="mx-4 mt-2 w-[calc(100%-2rem)]">
            <TabsTrigger value="files">{t.studio.panes.files}</TabsTrigger>
            <TabsTrigger value="edit">{t.studio.panes.edit}</TabsTrigger>
            <TabsTrigger value="checks">
              {t.studio.panes.checks}
              {errorCount > 0 && <span className="text-fail tabular-nums">{errorCount}</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="files" className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken">
            {tree}
          </TabsContent>
          <TabsContent value="edit" className="min-h-0 flex-1">
            {canvas}
          </TabsContent>
          <TabsContent value="checks" className="min-h-0 flex-1 overflow-y-auto">
            <ChecksPanel issues={issues} dirName={dirName} onSelectIssue={selectIssue} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
