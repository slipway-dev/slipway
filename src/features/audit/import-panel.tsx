"use client"

import { FileArchive, FolderOpen, Sparkles } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { filesFromList, filesFromZip, JOB_LIMITS, type ImportReport } from "@/features/runs/files"
import { importJobs } from "@/features/runs/store"
import { describeSkipped, filesFromDrop, filesFromInput, isZip, type PathedFile } from "@/lib/local-files"
import { ImportBudget } from "@/lib/safe-files"
import { cn } from "@/lib/utils"

async function reportFrom(files: PathedFile[]): Promise<ImportReport> {
  // One budget for the whole drop, so several zips cannot add up past the limits.
  const budget = new ImportBudget(JOB_LIMITS)
  const merged: ImportReport = { files: new Map(), skipped: budget.skipped }
  for (const [, file] of files.filter(([, f]) => isZip(f))) {
    filesFromZip(new Uint8Array(await file.arrayBuffer()), budget).files.forEach((blob, path) =>
      merged.files.set(path, blob),
    )
  }
  filesFromList(files.filter(([, f]) => !isZip(f)), budget).files.forEach((blob, path) => merged.files.set(path, blob))
  return merged
}

export function ImportPanel({ onImported }: { onImported: (ids: string[]) => void }) {
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(load: () => Promise<ImportReport>) {
    setBusy(true)
    try {
      const report = await load()
      const ids = await importJobs(report)
      if (ids.length === 0) {
        toast.error("No Harbor job found. Choose a job folder from jobs/, a zip of one, or a trajectory.json.")
        return
      }
      const skipped = describeSkipped(report.skipped)
      if (skipped) toast.warning(skipped)
      toast.success(ids.length === 1 ? "Imported 1 job" : `Imported ${ids.length} jobs`)
      onImported(ids)
    } catch (error) {
      toast.error(`Could not import: ${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const pending = filesFromDrop(e.dataTransfer)
        void run(async () => reportFrom(await pending))
      }}
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-dashed border-line-strong bg-surface p-6",
        dragging && "border-signal bg-surface-sunken",
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Drop a Harbor job here</p>
        <p className="text-body-sm text-ink-muted">
          A job folder from <code>jobs/</code>, the whole <code>jobs/</code> folder, a zip of either, or a single{" "}
          <code>trajectory.json</code>. Files are read in this browser and never uploaded.
        </p>
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
            if (files.length) void run(() => reportFrom(files))
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = filesFromInput(e.target.files)
            e.target.value = ""
            if (files.length) void run(() => reportFrom(files))
          }}
        />
        <Button variant="outline" disabled={busy} onClick={() => folderInput.current?.click()}>
          <FolderOpen />
          Choose folder
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          <FileArchive />
          Choose .zip or .json
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const response = await fetch("/samples/sample-job.zip")
              if (!response.ok) throw new Error(`sample download failed (${response.status})`)
              return filesFromZip(new Uint8Array(await response.arrayBuffer()))
            })
          }
        >
          <Sparkles />
          Open the sample job
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-hull p-3 text-code text-hull-ink">
        {"cd jobs && zip -r ../my-job.zip 2026-10-20__14-02-11"}
      </pre>
    </div>
  )
}
