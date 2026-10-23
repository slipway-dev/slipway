"use client"

import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/i18n/provider"

/** Leading slashes dropped; `..`, empty and folder paths refused. */
export function cleanNewPath(raw: string): string | undefined {
  const clean = raw.trim().replace(/^\/+/, "")
  if (!clean || clean.endsWith("/") || clean.split("/").includes("..")) return undefined
  return clean
}

interface NewFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (path: string) => void
}

export function NewFileDialog({ open, onOpenChange, onCreate }: NewFileDialogProps) {
  const t = useT()
  const id = useId()
  const [value, setValue] = useState("environment/")
  const [touched, setTouched] = useState(false)
  const path = cleanNewPath(value)

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
