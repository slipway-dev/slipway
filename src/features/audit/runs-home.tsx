"use client"

import { Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { deleteJob, useRuns, useRunsHydrated } from "@/features/runs/store"

import { ImportPanel } from "./import-panel"

export function RunsHome() {
  const hydrated = useRunsHydrated()
  const jobs = useRuns((s) => s.jobs)
  const router = useRouter()
  const sorted = Object.values(jobs).sort((a, b) => b.importedAt.localeCompare(a.importedAt))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-bold">Runs</h1>
        <p className="text-ink-muted">
          Audit what agents did in a Harbor job: every step, tool call and output, with the moves that can fake a
          reward flagged.
        </p>
      </div>

      <ImportPanel onImported={(ids) => router.push(ids.length === 1 ? `/runs/${ids[0]}` : "/runs")} />

      {hydrated && sorted.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="jobs-heading">
          <h2 id="jobs-heading" className="text-label uppercase text-ink-muted">
            Imported jobs
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((job) => (
              <li key={job.id} className="relative flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
                <Link href={`/runs/${job.id}`} className="font-mono text-code font-semibold after:absolute after:inset-0">
                  {job.name}
                </Link>
                <p className="text-body-sm">
                  {job.trialCount} {job.trialCount === 1 ? "trial" : "trials"} ·{" "}
                  <span className="text-pass">✓ {job.passCount} pass</span>
                </p>
                <p className="line-clamp-2 text-body-sm text-ink-muted">{job.agents.join(", ") || "No agent info"}</p>
                <div className="mt-auto flex items-center justify-between text-body-sm text-ink-muted">
                  <span>Imported {new Date(job.importedAt).toLocaleDateString()}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10"
                    aria-label={`Delete ${job.name}`}
                    onClick={() => {
                      if (confirm(`Delete ${job.name} and your notes on it?`)) void deleteJob(job.id)
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
