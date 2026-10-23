"use client"

import { FileUp, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { importTaskZip } from "@/features/task/archive"
import { taskTitle } from "@/features/task/model"
import { STARTERS } from "@/features/task/starters"
import { useHydrated, useStudio } from "@/features/task/store"

export function TaskList() {
  const hydrated = useHydrated()
  const projects = useStudio((s) => s.projects)
  const createProject = useStudio((s) => s.createProject)
  const addProject = useStudio((s) => s.addProject)
  const deleteProject = useStudio((s) => s.deleteProject)
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  const sorted = Object.values(projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  async function onImport(file: File) {
    try {
      const project = importTaskZip(new Uint8Array(await file.arrayBuffer()))
      router.push(`/studio/${addProject(project)}`)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-bold">Your tasks</h1>
          <p className="text-body-sm text-ink-muted">Saved in this browser.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImport(file)
              e.target.value = ""
            }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileUp />
            Import .zip
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
                <DialogDescription>Start from a working example or from what Harbor scaffolds.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    className="flex flex-col items-start gap-1 rounded-md border border-line-strong bg-surface p-4 text-left hover:bg-surface-sunken"
                    onClick={() => {
                      setOpen(false)
                      router.push(`/studio/${createProject(starter.id)}`)
                    }}
                  >
                    <span className="font-semibold">{starter.name}</span>
                    <span className="text-body-sm text-ink-muted">{starter.summary}</span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!hydrated ? (
        <p className="text-body-sm text-ink-muted">Loading tasks…</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong p-8">
          <p className="font-semibold">No tasks yet</p>
          <p className="text-body-sm text-ink-muted">
            Create one from a starter, or import a Harbor task folder you have zipped.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <li key={project.id} className="group relative flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
              <Link href={`/studio/${project.id}`} className="font-mono text-code font-semibold after:absolute after:inset-0">
                {taskTitle(project)}
              </Link>
              <p className="line-clamp-2 text-body-sm text-ink-muted">
                {project.config.task?.description || project.instruction || "No instruction yet."}
              </p>
              <div className="mt-auto flex items-center justify-between text-body-sm text-ink-muted">
                <span>Edited {new Date(project.updatedAt).toLocaleString()}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10"
                  aria-label={`Delete ${taskTitle(project)}`}
                  onClick={() => {
                    if (confirm(`Delete ${taskTitle(project)}? This cannot be undone.`)) deleteProject(project.id)
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
