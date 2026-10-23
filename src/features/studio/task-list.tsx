"use client"

import { FileUp, FolderOpen, Plus, Trash2, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { taskTitle } from "@/features/task/model"
import { STARTERS } from "@/features/task/starters"
import { useHydrated, useStudio } from "@/features/task/store"
import { filesFromDrop, filesFromInput, type PathedFile } from "@/lib/local-files"
import { LOCALE_TAGS } from "@/i18n/config"
import { useLocale, useT } from "@/i18n/provider"
import { skippedText } from "@/i18n/text"

import { readTasks } from "./import-tasks"

export function TaskList() {
  const t = useT()
  const tl = t.taskList
  const [locale] = useLocale()
  const hydrated = useHydrated()
  const projects = useStudio((s) => s.projects)
  const createProject = useStudio((s) => s.createProject)
  const addProject = useStudio((s) => s.addProject)
  const deleteProject = useStudio((s) => s.deleteProject)
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)

  const sorted = Object.values(projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  async function onImport(pending: Promise<PathedFile[]>) {
    try {
      const { projects, skipped } = await readTasks(await pending)
      const note = skippedText(t, skipped)
      if (note) toast.warning(note)
      if (projects.length === 0) {
        toast.error(tl.nothingImported)
        return
      }
      const ids = projects.map((project) => addProject(project))
      if (ids.length === 1) router.push(`/studio/${ids[0]}`)
      else toast.success(tl.imported(ids.length))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const when = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: "medium", timeStyle: "short" })

  return (
    <div
      className="relative flex flex-col gap-8"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void onImport(filesFromDrop(e.dataTransfer))
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute -inset-4 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-signal bg-paper/90">
          <p className="flex items-center gap-2 text-title font-semibold">
            <Upload className="size-5" aria-hidden />
            {tl.dropHere}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-display font-bold">{tl.title}</h1>
          <p className="text-body-sm text-ink-muted">{tl.lede}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={folderInput}
            type="file"
            className="hidden"
            // @ts-expect-error webkitdirectory is supported by every current browser but missing from React's types
            webkitdirectory=""
            multiple
            onChange={(e) => {
              const files = filesFromInput(e.target.files)
              e.target.value = ""
              if (files.length) void onImport(Promise.resolve(files))
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = filesFromInput(e.target.files)
              e.target.value = ""
              if (files.length) void onImport(Promise.resolve(files))
            }}
          />
          <Button variant="outline" onClick={() => folderInput.current?.click()}>
            <FolderOpen />
            {tl.importFolder}
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileUp />
            {tl.importZip}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                {tl.newTask}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tl.newTaskTitle}</DialogTitle>
                <DialogDescription>{tl.newTaskLede}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col divide-y divide-line rounded-md border border-line-strong bg-surface">
                {STARTERS.map((starter) => {
                  const text = tl.starters[starter.id] ?? starter
                  return (
                    <button
                      key={starter.id}
                      type="button"
                      className="flex flex-col items-start gap-1 p-4 text-left first:rounded-t-md last:rounded-b-md hover:bg-surface-sunken"
                      onClick={() => {
                        setOpen(false)
                        router.push(`/studio/${createProject(starter.id)}`)
                      }}
                    >
                      <span className="font-semibold">{text.name}</span>
                      <span className="text-body-sm text-ink-muted">{text.summary}</span>
                    </button>
                  )
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!hydrated ? (
        <p className="text-body-sm text-ink-muted">{tl.loading}</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-line-strong p-10">
          <p className="font-semibold">{tl.emptyTitle}</p>
          <p className="text-body-sm text-ink-muted">{tl.emptyBody}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full table-fixed text-left text-body-sm">
            <thead className="border-b border-line bg-surface-sunken text-label font-medium text-ink-muted">
              <tr>
                <th scope="col" className="w-[30%] px-4 py-3 font-semibold">{tl.columns.task}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">{tl.columns.description}</th>
                <th scope="col" className="w-56 px-4 py-3 font-semibold">{tl.columns.edited}</th>
                <th scope="col" className="w-14 px-2 py-3"><span className="sr-only">{t.common.delete}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((project) => (
                <tr key={project.id} className="group relative hover:bg-surface-sunken">
                  <td className="px-4 py-3">
                    <Link
                      href={`/studio/${project.id}`}
                      className="block truncate font-mono text-code font-semibold after:absolute after:inset-0 group-hover:underline"
                    >
                      {taskTitle(project)}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                    <span className="line-clamp-1">
                      {project.config.task?.description || project.instruction || tl.noInstruction}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted tabular-nums">{when.format(new Date(project.updatedAt))}</td>
                  <td className="px-2 py-1 text-right">
                    <ConfirmDialog
                      title={tl.confirmDelete(taskTitle(project))}
                      confirmLabel={t.common.delete}
                      onConfirm={() => deleteProject(project.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative z-10 text-ink-muted hover:text-fail"
                        aria-label={tl.deleteLabel(taskTitle(project))}
                      >
                        <Trash2 />
                      </Button>
                    </ConfirmDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
