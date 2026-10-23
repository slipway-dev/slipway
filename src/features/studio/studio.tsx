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

import { BlockList } from "./block-list"
import { CheckBar, ChecksPanel } from "./check-bar"
import { CodeEditor } from "./code-editor"
import { downloadBytes } from "./download"
import { FileView } from "./file-view"
import { GeneratedFiles } from "./generated-files"
import { SettingsForm } from "./settings-form"
import { SECTIONS, sectionText, type Selection } from "./slots"
import { TaskTree } from "./task-tree"
import { NewFileDialog } from "./new-file-dialog"

type MobileTab = "files" | "edit" | "checks"

/** Structured editor on the left, the files it generates on the right. */
function Split({ wide, editor, output }: { wide: boolean; editor: React.ReactNode; output: React.ReactNode }) {
  if (!wide) {
    return (
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-6 p-4">
          {editor}
          <div className="h-96">{output}</div>
        </div>
      </ScrollArea>
    )
  }
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0">
      <ResizablePanel defaultSize="50" minSize={360}>
        <ScrollArea className="h-full">
          <div className="p-6">{editor}</div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="50" minSize={320}>
        <div className="h-full p-3">{output}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function SectionHeader({ section }: { section: keyof typeof SECTIONS }) {
  const t = useT()
  const { label, hint } = sectionText(t, section)
  const Icon = SECTIONS[section].icon
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h2 className="flex items-baseline gap-2 text-title font-semibold">
        <Icon className="size-5 shrink-0 translate-y-0.5 self-start text-ink-muted" aria-hidden />
        {label}
        <span className="font-mono text-code font-normal text-ink-muted">{SECTIONS[section].target}</span>
      </h2>
      <p className="max-w-prose text-body-sm text-ink-muted">{hint}</p>
    </div>
  )
}

function Canvas({
  project,
  selection,
  onSelect,
  files,
  issues,
  lookup,
  wide,
}: {
  project: TaskProject
  selection: Selection
  onSelect: (selection: Selection) => void
  files: TaskFile[]
  issues: Issue[]
  lookup: ReturnType<typeof usePartLookup>
  wide: boolean
}) {
  const updateProject = useStudio((s) => s.updateProject)

  if (selection.kind === "file") {
    return (
      <div className="h-full p-4 lg:p-6">
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
      <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
        <SectionHeader section="instruction" />
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

  if (selection.kind === "settings") {
    return (
      <Split
        wide={wide}
        editor={
          <>
            <SectionHeader section="settings" />
            <SettingsForm project={project} />
          </>
        }
        output={<GeneratedFiles files={files.filter((f) => f.path === "task.toml")} onSelect={onSelect} />}
      />
    )
  }

  const dir = SECTIONS[selection.slot].target
  return (
    <Split
      key={selection.slot}
      wide={wide}
      editor={
        <>
          <SectionHeader section={selection.slot} />
          <BlockList project={project} slot={selection.slot} lookup={lookup} issues={issues} />
        </>
      }
      output={<GeneratedFiles files={files.filter((f) => f.path.startsWith(dir))} onSelect={onSelect} />}
    />
  )
}

export function Studio({ id }: { id: string }) {
  const t = useT()
  const hydrated = useHydrated()
  const project = useStudio((s) => s.projects[id])
  const setOverride = useStudio((s) => s.setOverride)
  const lookup = usePartLookup()
  const [selection, setSelection] = useState<Selection>({ kind: "instruction" })
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit")
  const [newFileOpen, setNewFileOpen] = useState(false)
  const wide = useMediaQuery("(min-width: 1024px)")

  const composed = useMemo(() => (project ? composeTask(project, lookup) : undefined), [project, lookup])
  const issues = useMemo(
    () => (project && composed ? lintTask(project, composed) : []),
    [project, composed],
  )

  if (!hydrated) {
    return <p className="p-4 text-body-sm text-ink-muted">{t.studio.loading}</p>
  }
  if (!project || !composed) {
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
      issues={issues}
      lookup={lookup}
      wide={wide}
    />
  )
  const errorCount = issues.filter((i) => i.severity === "error").length

  return (
    <div className="flex h-dvh flex-col">
      <NewFileDialog open={newFileOpen} onOpenChange={setNewFileOpen} onCreate={addFile} />
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-paper px-3 lg:px-4">
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
        <span className="hidden items-center gap-3 text-body-sm lg:flex" title={t.studio.checks.verifyHelp}>
          <span>
            <code className="text-code">oracle</code> {t.studio.checks.expects1}
          </span>
          <span>
            <code className="text-code">nop</code> {t.studio.checks.expected0}
          </span>
          <span className="rounded-sm border border-line px-1.5 text-label text-ink-muted">
            {t.studio.checks.unverified}
          </span>
        </span>
        <LocaleSwitch />
        <Button onClick={launch}>
          <Rocket />
          {t.studio.launch}
        </Button>
      </header>

      {wide ? (
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
