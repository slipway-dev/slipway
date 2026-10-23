"use client"

import { Lightbulb, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { instructionHints } from "@/features/task/hints"
import type { TaskFile } from "@/features/task/compose"
import type { TaskProject } from "@/features/task/model"
import type { TaskSimulation } from "@/features/task/simulate"
import { useStudio } from "@/features/task/store"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { CodeEditor } from "../code-editor"
import { GeneratedFiles } from "../generated-files"
import type { Selection } from "../slots"

export function InstructionEditorPane({ project }: { project: TaskProject }) {
  const updateProject = useStudio((s) => s.updateProject)
  return (
    <CodeEditor
      label="instruction.md"
      value={project.instruction}
      language="markdown"
      lineWrapping
      className="h-[min(60vh,32rem)] min-h-72"
      onChange={(value) => updateProject(project.id, (p) => void (p.instruction = value))}
    />
  )
}

/** What the agent will read, and what is worth fixing in it. */
export function InstructionLivePane({ project }: { project: TaskProject }) {
  const t = useT().workbench.instruction
  const hints = instructionHints(project)
  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <section className="flex min-h-48 flex-1 flex-col gap-2">
        <h3 className="font-semibold">{t.agentSees}</h3>
        <p className="text-body-sm text-ink-muted">{t.agentSeesHelp}</p>
        {project.instruction.trim() ? (
          <CodeEditor
            label={t.agentSees}
            value={project.instruction}
            language="markdown"
            lineWrapping
            readOnly
            className="min-h-0 flex-1 rounded-xl"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong p-4 text-body-sm text-ink-muted">{t.empty}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.hints}</h3>
        {hints.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{t.noHints}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hints.map((hint) => (
              <li key={hint.code + hint.params.path} className="flex items-start gap-2 text-body-sm text-warn">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t.pathNotMentioned(hint.params.path)}
              </li>
            ))}
          </ul>
        )}
        <ul className="flex flex-col gap-2 border-t border-line pt-3">
          {t.tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-body-sm text-ink-muted">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Dockerfile as it is written, or the files the agent starts with. */
export function EnvironmentLivePane({
  files,
  simulation,
  onSelect,
}: {
  files: TaskFile[]
  simulation: TaskSimulation
  onSelect: (selection: Selection) => void
}) {
  const t = useT()
  const [tab, setTab] = useState<"dockerfile" | "starting">("dockerfile")
  const c = t.workbench.environment
  const startFiles = [...simulation.initial.files].sort(([a], [b]) => a.localeCompare(b))
  const folders = [...simulation.initial.dirs].filter((d) => d !== "/").sort()

  return (
    <div className="flex h-full min-h-96 flex-col gap-4">
      <div role="tablist" className="flex w-fit rounded-lg border border-line bg-surface p-0.5">
        {(["dockerfile", "starting"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("rounded-md px-3 py-1 text-body-sm font-medium text-ink-muted", tab === id && "bg-surface-sunken text-ink")}
          >
            {id === "dockerfile" ? c.dockerfile : c.starting}
          </button>
        ))}
      </div>
      {tab === "dockerfile" ? (
        <div className="min-h-0 flex-1">
          <GeneratedFiles files={files.filter((f) => f.path.startsWith("environment/"))} onSelect={onSelect} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-body-sm text-ink-muted">{c.startingHelp}</p>
          {startFiles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-4 text-body-sm text-ink-muted">{c.noStarting}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {startFiles.map(([path, content]) => (
                <li key={path} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <code className="min-w-0 truncate font-mono text-code">{path}</code>
                  <span className="shrink-0 text-body-sm text-ink-muted tabular-nums">{content.length} B</span>
                </li>
              ))}
            </ul>
          )}
          {folders.length > 0 && (
            <p className="text-body-sm text-ink-muted">
              {c.folders}: <code className="font-mono text-code">{folders.join("  ")}</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
