"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { use, useMemo, useState } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCost, formatDuration, formatTokens } from "@/features/runs/format"
import { loadJob, useRuns } from "@/features/runs/store"
import { useT } from "@/i18n/provider"

import { FindingCounts, RewardValue, StatusLabel } from "./status"
import { useTrialAudits } from "./use-audits"

type Filter = "all" | "flagged" | "flagged-pass" | "failed"

/** One figure in the summary strip: label above, value, optional detail inline. */
export function Figure({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-label uppercase text-ink-muted">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold tabular-nums">{value}</span>
        {detail && <span className="text-body-sm text-ink-muted tabular-nums">{detail}</span>}
      </dd>
    </div>
  )
}

export function JobView({ id }: { id: string }) {
  const t = useT().runs
  const job = use(loadJob(id))
  const meta = useRuns((s) => s.jobs[id])
  const [filter, setFilter] = useState<Filter>("all")
  const trials = useMemo(() => job?.index.trials ?? [], [job])
  const files = useMemo(() => job?.files ?? new Map<string, Blob>(), [job])
  const audits = useTrialAudits(files, trials)

  if (!job) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p>{t.job.notSaved}</p>
        <Link href="/runs" className="text-tide underline-offset-4 hover:underline">
          {t.backToRuns}
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
        <nav aria-label={t.breadcrumb} className="text-body-sm text-ink-muted">
          <Link href="/runs" className="hover:text-ink">
            {t.title}
          </Link>{" "}
          /
        </nav>
        <h1 className="font-mono text-title font-semibold break-all">{meta?.name ?? id}</h1>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 border-y border-line py-3 sm:flex sm:flex-wrap">
        <Figure label={t.job.trials} value={trials.length} detail={errors ? t.job.errored(errors) : undefined} />
        <Figure
          label={t.job.passRate}
          value={trials.length ? `${Math.round((pass / trials.length) * 100)}%` : "—"}
          detail={t.job.passOf(pass, trials.length)}
        />
        <Figure
          label={t.job.tokens}
          value={formatTokens(sum((t) => t.inputTokens) + sum((t) => t.outputTokens))}
          detail={t.job.inOut(formatTokens(sum((t) => t.inputTokens)), formatTokens(sum((t) => t.outputTokens)))}
        />
        <Figure label={t.job.cost} value={cost ? formatCost(cost) : "—"} />
      </dl>

      {flaggedPasses.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-hull px-4 py-3 text-hull-ink">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-fail text-white">
            <X className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="font-semibold">{t.job.flaggedPasses(flaggedPasses.length)}</span>
          <span className="text-body-sm text-hull-muted">{t.job.flaggedPassesBody}</span>
          <button
            type="button"
            className="ml-auto rounded-sm text-body-sm font-semibold text-hull-tide underline-offset-4 hover:underline"
            onClick={() => setFilter("flagged-pass")}
          >
            {t.job.showThem}
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="trials-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trials-heading" className="text-label uppercase text-ink-muted">
            {t.job.trials}
          </h2>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-56" aria-label={t.job.filterLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "flagged", "flagged-pass", "failed"] as const).map((f) => (
                <SelectItem key={f} value={f}>
                  {t.job.filters[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-body-sm">
            <thead className="border-b border-line bg-surface-sunken text-label uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">{t.job.columns.trial}</th>
                <th className="px-3 py-2 font-semibold">{t.job.columns.agent}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.job.columns.reward}</th>
                <th className="px-3 py-2 font-semibold">{t.job.columns.status}</th>
                <th className="px-3 py-2 font-semibold">{t.job.columns.audit}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.job.columns.time}</th>
                <th className="px-3 py-2 text-right font-semibold">{t.job.columns.cost}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((trial) => {
                const audit = audits[trial.name]
                return (
                  <tr key={trial.name} className="border-b border-line last:border-0 hover:bg-surface-sunken">
                    <td className="px-3 py-2">
                      <Link
                        href={`/runs/${id}/${encodeURIComponent(trial.name)}`}
                        className="font-mono text-code font-semibold whitespace-nowrap text-tide underline-offset-4 hover:underline"
                      >
                        {trial.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{trial.agent}</span>
                      {trial.model && <span className="block font-mono text-code whitespace-nowrap text-ink-muted">{trial.model}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RewardValue value={trial.reward} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel status={trial.status} />
                    </td>
                    <td className="px-3 py-2">
                      {audit === undefined ? (
                        <span className="text-ink-muted">{t.job.checking}</span>
                      ) : audit === null ? (
                        <span className="text-ink-muted">{t.job.noTrajectory}</span>
                      ) : (
                        <FindingCounts findings={audit} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatDuration(trial.durationSec)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCost(trial.costUsd)}</td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-muted">
                    {t.job.noMatch}
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
