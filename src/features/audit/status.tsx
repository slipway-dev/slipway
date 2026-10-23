"use client"

import { AlertTriangle, Check, CircleSlash, Info, X, type LucideIcon } from "lucide-react"

import type { Finding, FindingSeverity } from "@/features/runs/audit"
import { formatReward } from "@/features/runs/format"
import type { TrialStatus } from "@/features/runs/job"
import type { Verdict } from "@/features/runs/store"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

/** Status always pairs an icon and a word with its color; pass and fail never differ by hue alone. */
const STATUS: Record<TrialStatus, { icon: LucideIcon; className: string }> = {
  pass: { icon: Check, className: "text-pass" },
  partial: { icon: AlertTriangle, className: "text-warn" },
  fail: { icon: X, className: "text-fail" },
  error: { icon: X, className: "text-fail" },
  unscored: { icon: CircleSlash, className: "text-warn" },
}

export function StatusLabel({ status, className }: { status: TrialStatus; className?: string }) {
  const t = useT().runs
  const s = STATUS[status]
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold whitespace-nowrap", s.className, className)}>
      <s.icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      {t.status[status]}
    </span>
  )
}

export function RewardValue({ value }: { value: number | undefined }) {
  return <span className="font-mono text-code tabular-nums">{formatReward(value)}</span>
}

const SEVERITY: Record<FindingSeverity, { icon: LucideIcon; className: string }> = {
  error: { icon: X, className: "text-fail" },
  warning: { icon: AlertTriangle, className: "text-warn" },
  info: { icon: Info, className: "text-ink-muted" },
}

export function SeverityGlyph({ severity }: { severity: FindingSeverity }) {
  const t = useT().runs
  const s = SEVERITY[severity]
  const word = { error: t.severity.errorWord, warning: t.severity.warningWord, info: t.severity.infoWord }[severity]
  return (
    <span className={cn("inline-flex items-center align-[-2px]", s.className)}>
      <s.icon className="size-3.5" strokeWidth={2.25} aria-hidden />
      <span className="sr-only">{word}</span>
    </span>
  )
}

/** "2 red flags · 1 warning", or "clean" when nothing matched. */
export function FindingCounts({ findings }: { findings: Finding[] }) {
  const t = useT().runs
  const count = (s: FindingSeverity) => findings.filter((f) => f.severity === s).length
  const parts = (["error", "warning", "info"] as const).filter((s) => count(s) > 0)
  if (parts.length === 0) return <span className="text-body-sm text-ink-muted">{t.severity.clean}</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 text-body-sm">
      {parts.map((s) => {
        const Icon = SEVERITY[s].icon
        return (
          <span key={s} className={cn("inline-flex items-center gap-1 font-semibold whitespace-nowrap", SEVERITY[s].className)}>
            <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
            {t.severity[s](count(s))}
          </span>
        )
      })}
    </span>
  )
}

export function findingMessage(t: ReturnType<typeof useT>["runs"], finding: Finding): string {
  return t.rules[finding.rule] ?? finding.message
}

export const VERDICTS: { value: Verdict; className: string }[] = [
  { value: "ok", className: "text-pass" },
  { value: "issue", className: "text-warn" },
  { value: "hack", className: "text-fail" },
]
