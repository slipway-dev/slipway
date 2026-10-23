"use client"

import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { validateManifest } from "@/features/parts/manifest"
import { partsForSlot } from "@/features/parts/registry"
import type { PartManifest, SlotId } from "@/features/parts/types"
import { useStudio } from "@/features/task/store"
import { useT } from "@/i18n/provider"
import { partText } from "@/i18n/text"

import { CodeEditor } from "./code-editor"
import { sectionText } from "./slots"

function exampleManifest(slot: SlotId): string {
  const examples: Record<SlotId, PartManifest> = {
    environment: {
      id: "my-org/sqlite-db",
      version: "1.0.0",
      name: "SQLite database",
      summary: "Installs sqlite3 and ships a seed database script.",
      slot: "environment",
      params: [
        { key: "seed", label: "Seed SQL", type: "code", language: "text", default: "CREATE TABLE t (id INTEGER);" },
      ],
      contributes: {
        files: [{ path: "environment/seed.sql", template: "{{seed}}" }],
        dockerfile: [
          { section: "system", template: "RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*" },
          { section: "setup", template: "COPY seed.sql /tmp/seed.sql\nRUN sqlite3 /app/data.db < /tmp/seed.sql && rm /tmp/seed.sql" },
        ],
      },
    },
    verifier: {
      id: "my-org/json-reward",
      version: "1.0.0",
      name: "Named rewards",
      summary: "Scores several criteria into /logs/verifier/reward.json.",
      slot: "verifier",
      role: "runner",
      params: [{ key: "file", label: "File to check", type: "string", default: "/app/out.txt", required: true }],
      contributes: {
        files: [
          {
            path: "tests/test.sh",
            executable: true,
            template:
              '#!/bin/bash\nexists=0; nonempty=0\n[ -f {{file|quote}} ] && exists=1\n[ -s {{file|quote}} ] && nonempty=1\necho "{\\"exists\\": $exists, \\"nonempty\\": $nonempty}" > /logs/verifier/reward.json\n',
          },
        ],
      },
    },
    solution: {
      id: "my-org/python-solution",
      version: "1.0.0",
      name: "Python solution",
      summary: "solve.sh that runs a Python script.",
      slot: "solution",
      role: "solver",
      params: [{ key: "code", label: "solve.py", type: "code", language: "python", default: "print('solved')\n" }],
      contributes: {
        files: [
          { path: "solution/solve.py", template: "{{code}}" },
          { path: "solution/solve.sh", executable: true, template: "#!/bin/bash\npython3 /solution/solve.py\n" },
        ],
      },
    },
  }
  return JSON.stringify(examples[slot], null, 2)
}

interface PartPickerProps {
  slot: SlotId
  /** Roles already held by a block on this task. */
  takenRoles: Set<string>
  onAdd: (part: PartManifest) => void
}

export function PartPicker({ slot, takenRoles, onAdd }: PartPickerProps) {
  const t = useT()
  const p = t.studio.picker
  const customParts = useStudio((s) => s.customParts)
  const saveCustomPart = useStudio((s) => s.saveCustomPart)
  const removeCustomPart = useStudio((s) => s.removeCustomPart)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("library")
  const [draft, setDraft] = useState(() => exampleManifest(slot))
  const [errors, setErrors] = useState<string[]>([])

  const parts = partsForSlot(slot, customParts)

  function add(part: PartManifest) {
    onAdd(part)
    setOpen(false)
  }

  function saveDraft() {
    let parsed: unknown
    try {
      parsed = JSON.parse(draft)
    } catch (error) {
      setErrors([p.notJson((error as Error).message)])
      return
    }
    const problems = validateManifest(parsed)
    const part = parsed as PartManifest
    if (!problems.length && part.slot !== slot) {
      problems.push(p.wrongSlot(part.slot))
    }
    setErrors(problems)
    if (problems.length) return
    saveCustomPart(part)
    toast.success(p.saved(part.name))
    add(part)
  }

  const meta = sectionText(t, slot)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setErrors([])
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus />
          {t.studio.blocks.addPart}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{p.title(meta.label)}</DialogTitle>
          <DialogDescription>{meta.hint}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="library">{p.library}</TabsTrigger>
            <TabsTrigger value="custom">{p.make}</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="min-h-0 flex-1">
            <ScrollArea className="h-[min(60vh,480px)] pr-3">
              <ul className="flex flex-col gap-2">
                {parts.map((part) => {
                  const blocked = Boolean(part.role && takenRoles.has(part.role))
                  const custom = customParts.some((c) => c.id === part.id)
                  const text = partText(t, part)
                  return (
                    <li key={part.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => add(part)}
                        className="flex flex-1 flex-col items-start gap-1 rounded-md border border-line-strong bg-surface p-3 text-left hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {text.name}
                          {part.role && <Badge variant="secondary" className="text-label uppercase">{part.role}</Badge>}
                          {custom && <Badge variant="outline">{p.yours}</Badge>}
                        </span>
                        <span className="text-body-sm text-ink-muted">{text.summary}</span>
                        <span className="font-mono text-body-sm text-ink-muted">
                          {part.id}@{part.version}
                          {blocked && part.role && ` · ${p.roleTaken(part.role)}`}
                        </span>
                      </button>
                      {custom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={p.deleteCustom(text.name)}
                          onClick={() => removeCustomPart(part.id)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="custom" className="flex min-h-0 flex-1 flex-col gap-3">
            <p className="text-body-sm text-ink-muted">
              {p.makeHelp}
            </p>
            <CodeEditor label={p.manifest} value={draft} onChange={setDraft} language="json" className="h-72 min-h-0" />
            {errors.length > 0 && (
              <ul className="flex flex-col gap-1 text-body-sm text-fail" role="alert">
                {errors.map((error) => (
                  <li key={error}>✕ {error}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDraft(exampleManifest(slot))}>
                {p.resetExample}
              </Button>
              <Button variant="secondary" onClick={saveDraft}>
                {p.saveAndAdd}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
