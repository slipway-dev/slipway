"use client"

import Link from "next/link"
import { use, useMemo, useState } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCost, formatDuration, formatTokens } from "@/features/runs/format"
import { loadJob, useRuns } from "@/features/runs/store"

import { FindingCounts, RewardValue, StatusLabel } from "./status"
import { useTrialAudits } from "./use-audits"

type Filter = "all" | "flagged" | "flagged-pass" | "failed"

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4">
      <span className="text-label uppercase text-ink-muted">{label}</span>
      <span className="text-title font-semibold tabular-nums">{value}</span>
      {detail && <span className="text-body-sm text-ink-muted">{detail}</span>}
    </div>
  )
}

export function JobView({ id }: { id: string }) {
  const job = use(loadJob(id))
  const meta = useRuns((s) => s.jobs[id])
  const [filter, setFilter] = useState<Filter>("all")
  const trials = useMemo(() => job?.index.trials ?? [], [job])
  const files = useMemo(() => job?.files ?? new Map<string, Blob>(), [job])
  const audits = useTrialAudits(files, trials)

  if (!job) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p>This job is not saved in this browser.</p>
        <Link href="/runs" className="text-tide underline-offset-4 hover:underline">
          Back to Runs
        </Link>
      </div>
    )
  }

  const pass = trials.filter((t) => t.status === "pass").length
  const errors = trials.filter((t) => t.status === "error").length
  const sum = (pick: (t: (typeof trials)[number]) => number | undefined) =>
    trials.reduce((acc, t) => acc + (pick(t) ?? 0), 0)
  const cost = sum((t) => t.costUsd)
  const flaggedPasses = trials.filter((t) => t.status === "pass" && audits[t.name]?.some((f) => f.severity === "error"))

  const visible = trials.filter((t) => {
    const findings = audits[t.name]
    if (filter === "flagged") return Boolean(findings?.length)
    if (filter === "flagged-pass") return flaggedPasses.includes(t)
    if (filter === "failed") return t.status !== "pass"
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <nav aria-label="Breadcrumb" className="text-body-sm text-ink-muted">
          <Link href="/runs" className="hover:text-ink">
            Runs
          </Link>{" "}
          /
        </nav>
        <h1 className="font-mono text-title font-semibold break-all">{meta?.name ?? id}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Trials" value={trials.length} detail={errors ? `${errors} errored` : undefined} />
        <Stat
          label="Pass rate"
          value={trials.length ? `${Math.round((pass / trials.length) * 100)}%` : "—"}
          detail={`${pass} of ${trials.length}`}
        />
        <Stat
          label="Tokens"
          value={formatTokens(sum((t) => t.inputTokens) + sum((t) => t.outputTokens))}
          detail={`${formatTokens(sum((t) => t.inputTokens))} in · ${formatTokens(sum((t) => t.outputTokens))} out`}
        />
        <Stat label="Cost" value={cost ? formatCost(cost) : "—"} />
      </div>

      {flaggedPasses.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line-strong bg-surface p-4">
          <span className="font-semibold text-fail">✕ {flaggedPasses.length === 1 ? "1 passing trial has" : `${flaggedPasses.length} passing trials have`} red flags</span>
          <span className="text-body-sm text-ink-muted">A reward of 1 may not mean the task was solved.</span>
          <button
            type="button"
            className="text-body-sm text-tide underline-offset-4 hover:underline"
            onClick={() => setFilter("flagged-pass")}
          >
            Show them
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="trials-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trials-heading" className="text-label uppercase text-ink-muted">
            Trials
          </h2>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-56" aria-label="Filter trials">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trials</SelectItem>
              <SelectItem value="flagged">Any audit flag</SelectItem>
              <SelectItem value="flagged-pass">Passed with red flags</SelectItem>
              <SelectItem value="failed">Not passed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-body-sm">
            <thead className="border-b border-line text-label uppercase text-ink-muted">
              <tr>
                <th className="p-3 font-semibold">Trial</th>
                <th className="p-3 font-semibold">Agent</th>
                <th className="p-3 font-semibold">Reward</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Audit</th>
                <th className="p-3 text-right font-semibold">Time</th>
                <th className="p-3 text-right font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((trial) => {
                const audit = audits[trial.name]
                return (
                  <tr key={trial.name} className="border-b border-line last:border-0 hover:bg-surface-sunken">
                    <td className="p-3">
                      <Link
                        href={`/runs/${id}/${encodeURIComponent(trial.name)}`}
                        className="font-mono text-code font-semibold text-tide underline-offset-4 hover:underline"
                      >
                        {trial.name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{trial.agent}</span>
                      {trial.model && <span className="block text-ink-muted">{trial.model}</span>}
                    </td>
                    <td className="p-3">
                      <RewardValue value={trial.reward} />
                    </td>
                    <td className="p-3">
                      <StatusLabel status={trial.status} />
                    </td>
                    <td className="p-3">
                      {audit === undefined ? (
                        <span className="text-ink-muted">checking…</span>
                      ) : audit === null ? (
                        <span className="text-ink-muted">no trajectory</span>
                      ) : (
                        <FindingCounts findings={audit} />
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatDuration(trial.durationSec)}</td>
                    <td className="p-3 text-right tabular-nums">{formatCost(trial.costUsd)}</td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-muted">
                    No trials match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
