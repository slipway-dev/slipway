"use client"

import { CircleCheck, CircleHelp, CircleX } from "lucide-react"

import type { SimRun, TaskSimulation } from "@/features/task/simulate"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

export type ViewMode = "blueprint" | "source"

/** Blueprint and Source are the two ends of the Studio; the workbench in between belongs to the blueprint. */
export function ViewSwitch({ active, onChange }: { active: ViewMode; onChange: (mode: ViewMode) => void }) {
  const t = useT().views
  return (
    <div role="group" aria-label={t.label} className="flex rounded-lg border border-line bg-surface-sunken p-0.5">
      {(["blueprint", "source"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={active === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-md px-3 py-1 text-body-sm font-medium text-ink-muted hover:text-ink",
            active === mode && "bg-surface text-ink shadow-xs",
          )}
        >
          {t[mode]}
        </button>
      ))}
    </div>
  )
}

function RunChip({ name, run }: { name: string; run: SimRun | undefined }) {
  const t = useT().blueprint
  const outcome = run?.outcome ?? "unknown"
  const Icon = outcome === "as-expected" ? CircleCheck : outcome === "unknown" ? CircleHelp : CircleX
  const tone = outcome === "as-expected" ? "text-pass" : outcome === "unknown" ? "text-ink-muted" : "text-fail"
  return (
    <span className="flex items-center gap-1.5">
      <Icon className={cn("size-4", tone)} aria-hidden />
      <code className="text-code">{name}</code>
      <span className="font-mono text-code tabular-nums">{run?.reward === undefined ? t.simUnknown : String(run.reward)}</span>
    </span>
  )
}

/** The oracle and nop rewards the simulator predicts, or "unverified" when it cannot. */
export function SimBadge({ simulation }: { simulation: TaskSimulation }) {
  const t = useT()
  if (!simulation.supported) {
    return (
      <span className="hidden items-center gap-3 text-body-sm lg:flex" title={t.studio.checks.verifyHelp}>
        <span>
          <code className="text-code">oracle</code> {t.studio.checks.expects1}
        </span>
        <span>
          <code className="text-code">nop</code> {t.studio.checks.expected0}
        </span>
        <span className="rounded-sm border border-line px-1.5 text-label text-ink-muted">{t.studio.checks.unverified}</span>
      </span>
    )
  }
  return (
    <span className="hidden items-center gap-4 text-body-sm lg:flex" title={t.sim.lede}>
      <RunChip name="oracle" run={simulation.runs.find((r) => r.id === "oracle")} />
      <RunChip name="nop" run={simulation.runs.find((r) => r.id === "nop")} />
      <span className="rounded-sm border border-line px-1.5 text-label text-ink-muted">{t.sim.simulated}</span>
    </span>
  )
}
