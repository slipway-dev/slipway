"use client"

import { Check, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteJob, useRuns, useRunsHydrated } from "@/features/runs/store"
import { LOCALE_TAGS } from "@/i18n/config"
import { useLocale, useT } from "@/i18n/provider"

import { ImportPanel } from "./import-panel"

export function RunsHome() {
  const common = useT().common
  const t = useT().runs
  const [locale] = useLocale()
  const hydrated = useRunsHydrated()
  const jobs = useRuns((s) => s.jobs)
  const router = useRouter()
  const sorted = Object.values(jobs).sort((a, b) => b.importedAt.localeCompare(a.importedAt))
  const date = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-bold">{t.title}</h1>
        <p className="max-w-3xl text-ink-muted">{t.lede}</p>
      </div>

      <ImportPanel onImported={(ids) => router.push(ids.length === 1 ? `/runs/${ids[0]}` : "/runs")} />

      {hydrated && sorted.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="jobs-heading">
          <h2 id="jobs-heading" className="text-label font-medium text-ink-muted">
            {t.jobs.heading}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-body-sm">
              <thead className="border-b border-line bg-surface-sunken text-label font-medium text-ink-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">{t.jobs.columns.job}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t.jobs.columns.trials}</th>
                  <th className="px-3 py-3 font-semibold">{t.jobs.columns.pass}</th>
                  <th className="px-3 py-3 font-semibold">{t.jobs.columns.agents}</th>
                  <th className="px-3 py-3 font-semibold">{t.jobs.columns.imported}</th>
                  <th className="w-10 px-3 py-3">
                    <span className="sr-only">{t.jobs.deleteLabel("")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job) => (
                  <tr key={job.id} className="border-b border-line last:border-0 hover:bg-surface-sunken">
                    <td className="px-3 py-2">
                      <Link
                        href={`/runs/${job.id}`}
                        className="font-mono text-code font-semibold text-tide underline-offset-4 hover:underline"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{job.trialCount}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-pass tabular-nums">
                        <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
                        {job.passCount}
                      </span>
                    </td>
                    <td className="max-w-80 truncate px-3 py-2 text-ink-muted">
                      {job.agents.join(", ") || t.jobs.noAgent}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted tabular-nums">
                      {date.format(new Date(job.importedAt))}
                    </td>
                    <td className="px-1 py-1 text-right">
                      <ConfirmDialog
                        title={t.jobs.confirmDelete(job.name)}
                        confirmLabel={common.delete}
                        onConfirm={() => void deleteJob(job.id)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t.jobs.deleteLabel(job.name)}
                        >
                          <Trash2 />
                        </Button>
                      </ConfirmDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
