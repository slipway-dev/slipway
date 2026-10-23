import type { Finding, FindingSeverity } from "@/features/runs/audit"
import { formatReward } from "@/features/runs/format"
import type { TrialStatus } from "@/features/runs/job"
import type { Verdict } from "@/features/runs/store"
import { cn } from "@/lib/utils"

/** Status always pairs a glyph and a word with its color; pass and fail never differ by hue alone. */
const STATUS: Record<TrialStatus, { glyph: string; word: string; className: string }> = {
  pass: { glyph: "✓", word: "pass", className: "text-pass" },
  partial: { glyph: "!", word: "partial", className: "text-warn" },
  fail: { glyph: "✕", word: "fail", className: "text-fail" },
  error: { glyph: "✕", word: "error", className: "text-fail" },
  unscored: { glyph: "!", word: "unscored", className: "text-warn" },
}

export function StatusLabel({ status, className }: { status: TrialStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold whitespace-nowrap", s.className, className)}>
      <span aria-hidden>{s.glyph}</span>
      {s.word}
    </span>
  )
}

export function RewardValue({ value }: { value: number | undefined }) {
  return <span className="font-mono text-code tabular-nums">{formatReward(value)}</span>
}

const SEVERITY: Record<FindingSeverity, { glyph: string; word: string; className: string }> = {
  error: { glyph: "✕", word: "red flag", className: "text-fail" },
  warning: { glyph: "!", word: "warning", className: "text-warn" },
  info: { glyph: "i", word: "note", className: "text-ink-muted" },
}

export function SeverityGlyph({ severity }: { severity: FindingSeverity }) {
  const s = SEVERITY[severity]
  return (
    <span className={cn("font-semibold", s.className)}>
      <span aria-hidden>{s.glyph}</span>
      <span className="sr-only">{s.word}</span>
    </span>
  )
}

/** "✕ 2 · ! 1", or "clean" when nothing matched. */
export function FindingCounts({ findings }: { findings: Finding[] }) {
  const count = (s: FindingSeverity) => findings.filter((f) => f.severity === s).length
  const parts = (["error", "warning", "info"] as const).filter((s) => count(s) > 0)
  if (parts.length === 0) return <span className="text-body-sm text-ink-muted">clean</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-body-sm">
      {parts.map((s) => (
        <span key={s} className={cn("font-semibold whitespace-nowrap", SEVERITY[s].className)}>
          {SEVERITY[s].glyph} {count(s)} {count(s) === 1 ? SEVERITY[s].word : `${SEVERITY[s].word}s`}
        </span>
      ))}
    </span>
  )
}

export const VERDICTS: { value: Verdict; label: string; className: string }[] = [
  { value: "ok", label: "Looks right", className: "text-pass" },
  { value: "issue", label: "Mistake", className: "text-warn" },
  { value: "hack", label: "Reward hack", className: "text-fail" },
]
