"use client"

import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Author, TaskConfig } from "@/features/harbor/task-config"
import type { TaskProject } from "@/features/task/model"
import { useStudio } from "@/features/task/store"

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: (id: string) => React.ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {description && <p className="text-body-sm text-ink-muted">{description}</p>}
    </div>
  )
}

function formatAuthors(authors: Author[] = []): string {
  return authors.map((a) => (a.email ? `${a.name} <${a.email}>` : a.name)).join("\n")
}

function parseAuthors(text: string): Author[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(.*?)\s*<([^>]+)>$/.exec(line)
      return m ? { name: m[1], email: m[2] } : { name: line }
    })
}

function parseKeywords(text: string): string[] {
  return text
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
}

/**
 * Text that edits a parsed value. The typed text is kept so a trailing
 * comma or newline survives, and replaced only when the value changes from
 * outside (an import, another tab), i.e. no longer matches what was typed.
 */
function useParsedText<T>(value: T, format: (value: T) => string, parse: (text: string) => T) {
  const [text, setText] = useState(() => format(value))
  const external = format(value)
  if (external !== format(parse(text))) setText(external)
  return [text, setText] as const
}

const DIFFICULTIES = ["easy", "medium", "hard"]

export function SettingsForm({ project }: { project: TaskProject }) {
  const updateProject = useStudio((s) => s.updateProject)
  const { config } = project
  const update = (fn: (config: TaskConfig) => void) => updateProject(project.id, (p) => fn(p.config))
  const task = config.task ?? { name: "" }
  const [authorsText, setAuthorsText] = useParsedText(task.authors ?? [], formatAuthors, parseAuthors)
  const [keywordsText, setKeywordsText] = useParsedText(task.keywords ?? [], (k) => k.join(", "), parseKeywords)

  const timeout = (
    section: "agent" | "verifier" | "environment",
    key: "timeout_sec" | "build_timeout_sec",
    label: string,
  ) => (
    <Field label={label}>
      {(id) => (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={(config[section] as Record<string, unknown> | undefined)?.[key] as number | undefined ?? ""}
          placeholder="Harbor default"
          onChange={(e) =>
            update((c) => {
              const target = (c[section] ??= {}) as Record<string, unknown>
              if (e.target.value === "") delete target[key]
              else target[key] = Number(e.target.value)
            })
          }
        />
      )}
    </Field>
  )

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h3 className="text-label uppercase text-ink-muted">[task]</h3>
        <Field label="Name" description='"org/name", the id Harbor and its registry use.'>
          {(id) => (
            <Input
              id={id}
              value={task.name}
              placeholder="my-org/my-task"
              className="font-mono text-code"
              onChange={(e) => update((c) => void ((c.task ??= { name: "" }).name = e.target.value))}
            />
          )}
        </Field>
        <Field label="Description">
          {(id) => (
            <Textarea
              id={id}
              value={task.description ?? ""}
              onChange={(e) => update((c) => void ((c.task ??= { name: "" }).description = e.target.value))}
            />
          )}
        </Field>
        <Field label="Authors" description="One per line, as Name <email>.">
          {(id) => (
            <Textarea
              id={id}
              value={authorsText}
              onChange={(e) => {
                setAuthorsText(e.target.value)
                update((c) => void ((c.task ??= { name: "" }).authors = parseAuthors(e.target.value)))
              }}
            />
          )}
        </Field>
        <Field label="Keywords" description="Separated by commas.">
          {(id) => (
            <Input
              id={id}
              value={keywordsText}
              onChange={(e) => {
                setKeywordsText(e.target.value)
                update((c) => void ((c.task ??= { name: "" }).keywords = parseKeywords(e.target.value)))
              }}
            />
          )}
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-label uppercase text-ink-muted">[metadata]</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty">
            {(id) => (
              <Select
                value={typeof config.metadata?.difficulty === "string" ? config.metadata.difficulty : undefined}
                onValueChange={(v) => update((c) => void ((c.metadata ??= {}).difficulty = v))}
              >
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Category">
            {(id) => (
              <Input
                id={id}
                value={typeof config.metadata?.category === "string" ? config.metadata.category : ""}
                placeholder="software-engineering"
                onChange={(e) => update((c) => void ((c.metadata ??= {}).category = e.target.value))}
              />
            )}
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-label uppercase text-ink-muted">Timeouts (seconds)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {timeout("agent", "timeout_sec", "Agent")}
          {timeout("verifier", "timeout_sec", "Verifier")}
          {timeout("environment", "build_timeout_sec", "Image build")}
        </div>
      </section>
    </div>
  )
}
