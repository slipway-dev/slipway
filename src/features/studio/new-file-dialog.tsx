"use client"

import { Upload } from "lucide-react"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FileOverride } from "@/features/task/model"
import { TASK_LIMITS } from "@/features/task/archive"
import { useT } from "@/i18n/provider"
import { decodeText, toBase64 } from "@/lib/safe-files"

/** Leading slashes dropped; `..`, empty and folder paths refused. */
export function cleanNewPath(raw: string): string | undefined {
  const clean = raw.trim().replace(/^\/+/, "")
  if (!clean || clean.endsWith("/") || clean.split("/").includes("..")) return undefined
  return clean
}

/** Where picked files go: into the typed folder, or, for one file, at the typed path. */
export function uploadPaths(raw: string, names: string[]): (string | undefined)[] {
  const typed = raw.trim().replace(/^\/+/, "")
  if (names.length === 1 && typed && !typed.endsWith("/")) return [cleanNewPath(typed)]
  const folder = typed.endsWith("/") || !typed ? typed : typed.slice(0, typed.lastIndexOf("/") + 1)
  return names.map((name) => cleanNewPath(folder + name))
}

interface NewFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (path: string) => void
  /** Files picked from disk; binary files arrive as base64. */
  onUpload: (files: [string, FileOverride][]) => void
}

export function NewFileDialog({ open, onOpenChange, onCreate, onUpload }: NewFileDialogProps) {
  const t = useT()
  const id = useId()
  const [value, setValue] = useState("environment/")
  const [touched, setTouched] = useState(false)
  const path = cleanNewPath(value)
  const picker = useRef<HTMLInputElement>(null)

  async function upload(list: FileList | null) {
    const files = [...(list ?? [])]
    if (!files.length) return
    const paths = uploadPaths(value, files.map((f) => f.name))
    const out: [string, FileOverride][] = []
    for (const [i, file] of files.entries()) {
      const target = paths[i]
      if (!target) continue
      if (file.size > TASK_LIMITS.maxFileBytes) {
        toast.error(t.studio.tree.tooLarge(file.name, Math.round(TASK_LIMITS.maxFileBytes / 1024 / 1024)))
        continue
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const text = decodeText(bytes)
      out.push([
        target,
        text === undefined ? { content: toBase64(bytes), encoding: "base64" } : { content: text, executable: target.endsWith(".sh") },
      ])
    }
    if (out.length) {
      onOpenChange(false)
      onUpload(out)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setValue("environment/")
          setTouched(false)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (!path) return
            onOpenChange(false)
            onCreate(path)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.studio.tree.addFile}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{t.studio.tree.newFilePrompt}</Label>
            <Input
              id={id}
              autoFocus
              value={value}
              aria-invalid={touched && !path}
              aria-describedby={`${id}-hint`}
              className="font-mono text-code"
              onChange={(e) => setValue(e.target.value)}
            />
            <p id={`${id}-hint`} className={touched && !path ? "text-body-sm text-fail" : "text-body-sm text-ink-muted"}>
              {t.studio.tree.newFileHint}
            </p>
          </div>
          <DialogFooter>
            <input
              ref={picker}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void upload(e.target.files)
                e.target.value = ""
              }}
            />
            <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => picker.current?.click()}>
              <Upload />
              {t.studio.tree.upload}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="secondary">
              {t.studio.tree.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
