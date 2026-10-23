"use client"

import { useCallback, useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { contentText, findSubagent, totals, type TrajectoryProblem } from "@/features/runs/atif"
import { SEVERITY_ORDER, worstSeverity, type Finding } from "@/features/runs/audit"
import { formatCost, formatDuration, formatTokens } from "@/features/runs/format"
import { annotationKey } from "@/features/runs/store"
import type { FileSet } from "@/features/runs/files"
import type { Step, Trajectory } from "@/features/runs/types"

import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { SeverityGlyph } from "./status"
import { StepCard } from "./step-card"

function stepText(step: Step): string {
  return [
    contentText(step.message),
    step.reasoning_content ?? "",
    ...(step.tool_calls ?? []).map((c) => `${c.function_name} ${JSON.stringify(c.arguments)}`),
    ...(step.observation?.results ?? []).map((r) => contentText(r.content)),
  ]
    .join("\n")
    .toLowerCase()
}

interface TrajectoryViewProps {
  root: Trajectory
  warnings: TrajectoryProblem[]
  findings: Finding[]
  jobId: string
  trial: string
  /** Folder holding trajectory.json, for resolving image paths. */
  baseDir: string
  files: FileSet
}

export function TrajectoryView({ root, warnings, findings, jobId, trial, baseDir, files }: TrajectoryViewProps) {
  const t = useT().runs.trajectory
  const tj = useT().runs.job
  const [path, setPath] = useState<string[]>([])
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [query, setQuery] = useState("")

  const currentId = path[path.length - 1] ?? ""
  const current = currentId ? (findSubagent(root, currentId) ?? root) : root
  const scoped = useMemo(() => findings.filter((f) => f.trajectory === currentId), [findings, currentId])
  const stats = totals(current)
  const startTime = current.steps.map((s) => (s.timestamp ? Date.parse(s.timestamp) : NaN)).find(Number.isFinite)

  const resolve = useCallback(
    (p: string) => files.get(`${baseDir}/${p.replace(/^\.?\//, "")}`) ?? files.get(`${baseDir}/${p.split("/").pop()}`),
    [files, baseDir],
  )

  const q = query.trim().toLowerCase()
  const visible = current.steps.filter(
    (step) =>
      (!onlyFlagged || scoped.some((f) => f.stepId === step.step_id)) && (!q || stepText(step).includes(q)),
  )
  const anchor = (stepId: number) => `step-${currentId || "root"}-${stepId}`

  return (
    <div className="flex flex-col gap-4">
      {path.length > 0 && (
        <nav aria-label={t.subagents} className="flex flex-wrap items-center gap-1 text-body-sm">
          <button type="button" className="text-tide underline-offset-4 hover:underline" onClick={() => setPath([])}>
            {root.agent.name}
          </button>
          {path.map((id, i) => (
            <span key={id} className="flex items-center gap-1">
              <span className="text-ink-muted">›</span>
              {i === path.length - 1 ? (
                <span className="font-semibold">{id}</span>
              ) : (
                <button type="button" className="text-tide underline-offset-4 hover:underline" onClick={() => setPath(path.slice(0, i + 1))}>
                  {id}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-body-sm">
        {[
          [t.agent, `${current.agent.name}${current.agent.version ? ` ${current.agent.version}` : ""}`],
          [t.model, current.agent.model_name ?? "—"],
          [t.steps, String(stats.steps)],
          [t.toolCalls, String(stats.toolCalls)],
          [t.tokens, tj.inOut(formatTokens(stats.promptTokens), formatTokens(stats.completionTokens))],
          [t.cost, formatCost(stats.costUsd)],
          [t.span, formatDuration(stats.durationSec)],
          [t.format, current.schema_version ?? "ATIF"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-label uppercase text-ink-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {warnings.length > 0 && (
        <details className="rounded-md border border-line bg-surface p-3 text-body-sm">
          <summary className="cursor-pointer font-semibold text-warn">
            {t.departures(warnings.length)}
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.searchLabel}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-body-sm">
          <Switch checked={onlyFlagged} onCheckedChange={setOnlyFlagged} />
          {t.onlyFlagged}
        </label>
        <span className="text-body-sm text-ink-muted">
          {t.shown(visible.length, current.steps.length)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[168px_minmax(0,1fr)]">
        <nav aria-label={t.stepIndex} className="hidden lg:block">
          <ol className="sticky top-4 flex max-h-[calc(100dvh-2rem)] flex-col gap-0.5 overflow-y-auto">
            {visible.map((step) => {
              const worst = worstSeverity(scoped.filter((f) => f.stepId === step.step_id))
              return (
                <li key={step.step_id}>
                  <a
                    href={`#${anchor(step.step_id)}`}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1 text-body-sm hover:bg-surface",
                      worst === "error" && "bg-surface",
                    )}
                  >
                    <span className="w-7 text-right font-mono text-code text-ink-muted tabular-nums">{step.step_id}</span>
                    <span className={cn("flex-1", step.source === "agent" ? "text-ink" : "text-ink-muted")}>
                      {t.sources[step.source] ?? step.source}
                    </span>
                    {worst && <SeverityGlyph severity={worst} />}
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-col gap-3">
          {visible.map((step) => (
            <StepCard
              key={step.step_id}
              step={step}
              anchorId={anchor(step.step_id)}
              startTime={startTime}
              defaultModel={current.agent.model_name}
              findings={scoped
                .filter((f) => f.stepId === step.step_id)
                .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])}
              annotationKey={annotationKey(jobId, trial, currentId, step.step_id)}
              resolve={resolve}
              onOpenSubagent={(id) => {
                setPath([...path, id])
                window.scrollTo({ top: 0 })
              }}
            />
          ))}
          {visible.length === 0 && <p className="text-body-sm text-ink-muted">{t.noMatch}</p>}
          {current.continued_trajectory_ref && (
            <p className="text-body-sm text-ink-muted">
              {t.continues}<code>{current.continued_trajectory_ref}</code>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
