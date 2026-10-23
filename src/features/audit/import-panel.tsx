"use client"

import { FileArchive, FolderOpen, Sparkles, Terminal } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { filesFromList, filesFromZip, JOB_LIMITS, type ImportReport } from "@/features/runs/files"
import { importJobs } from "@/features/runs/store"
import { filesFromDrop, filesFromInput, isZip, type PathedFile } from "@/lib/local-files"
import { ImportBudget } from "@/lib/safe-files"
import { useT } from "@/i18n/provider"
import { skippedText } from "@/i18n/text"
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
  const messages = useT()
  const t = messages.runs.import
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
        toast.error(t.noJob)
        return
      }
      const skipped = skippedText(messages, report.skipped)
      if (skipped) toast.warning(skipped)
      toast.success(t.imported(ids.length))
      onImported(ids)
    } catch (error) {
      toast.error(t.failed((error as Error).message))
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
        "grid gap-x-8 gap-y-4 rounded-lg border border-dashed border-line-strong bg-surface p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
        dragging && "border-solid border-tide bg-surface-sunken",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{dragging ? t.dropHere : t.title}</h2>
        <p className="max-w-prose text-body-sm text-ink-muted">{t.body}</p>
      </div>
      <div className="flex flex-wrap gap-2 md:col-start-1 md:row-start-2">
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
          {t.chooseFolder}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          <FileArchive />
          {t.chooseFile}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const response = await fetch("/samples/sample-job.zip")
              if (!response.ok) throw new Error(t.sampleFailed(response.status))
              return filesFromZip(new Uint8Array(await response.arrayBuffer()))
            })
          }
        >
          <Sparkles />
          {t.sample}
        </Button>
      </div>
      <figure className="flex min-w-0 flex-col gap-1.5 md:col-start-2 md:row-span-2 md:row-start-1">
        <figcaption className="flex items-center gap-1.5 text-label uppercase text-ink-muted">
          <Terminal className="size-3.5" aria-hidden />
          {t.zipHint}
        </figcaption>
        <pre className="rounded-md bg-hull px-3 py-2.5 text-code break-all whitespace-pre-wrap text-hull-ink">
          {"cd jobs && zip -r ../my-job.zip 2026-10-20__14-02-11"}
        </pre>
      </figure>
    </div>
  )
}
