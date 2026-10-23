"use client"

import { useEffect, useState } from "react"

import { parseTrajectory } from "@/features/runs/atif"
import { auditTrajectory, type Finding } from "@/features/runs/audit"
import { readText, type FileSet } from "@/features/runs/files"
import { trajectoryPath, type TrialSummary } from "@/features/runs/job"

/** undefined: still auditing; null: the trial recorded no readable trajectory. */
export type TrialAudit = Finding[] | null | undefined

export async function auditTrial(files: FileSet, trial: TrialSummary): Promise<Finding[] | null> {
  const paths = trial.stepNames.length
    ? trial.stepNames.map((step) => trajectoryPath(trial.name, step))
    : [trajectoryPath(trial.name)]
  let found = false
  const findings: Finding[] = []
  for (const path of paths) {
    const text = await readText(files, path)
    if (text === undefined) continue
    const { trajectory } = parseTrajectory(text)
    if (!trajectory) continue
    found = true
    findings.push(...auditTrajectory(trajectory))
  }
  return found ? findings : null
}

/** Audit every trial in the background, a few at a time, for the job table. */
export function useTrialAudits(files: FileSet, trials: TrialSummary[]): Record<string, TrialAudit> {
  const [audits, setAudits] = useState<Record<string, TrialAudit>>({})
  useEffect(() => {
    let cancelled = false
    const queue = [...trials]
    async function worker() {
      for (let trial = queue.shift(); trial && !cancelled; trial = queue.shift()) {
        const result = await auditTrial(files, trial)
        if (!cancelled) setAudits((prev) => ({ ...prev, [trial!.name]: result }))
      }
    }
    void Promise.all(Array.from({ length: 4 }, worker))
    return () => {
      cancelled = true
    }
  }, [files, trials])
  return audits
}
