"use client"

import { CircleCheck, CircleHelp, CircleX, MinusCircle, TriangleAlert } from "lucide-react"

import type { CheckResult, StepResult } from "@/features/flow/simulate"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

type Tone = "good" | "bad" | "warn" | "muted"

const TONE: Record<Tone, string> = {
  good: "text-pass",
  bad: "text-fail",
  warn: "text-warn",
  muted: "text-ink-muted",
}

function Chip({ tone, icon: Icon, children, title }: { tone: Tone; icon: typeof CircleCheck; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-body-sm whitespace-nowrap", TONE[tone])}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  )
}

function useReason() {
  const t = useT().editor
  return (reason: string | undefined) => (reason ? (t.reasons[reason] ?? reason) : undefined)
}

/**
 * How one check fares under the two agents that matter: the oracle should
 * pass it, and the nop agent (which does nothing) should not.
 */
export function CheckBadges({ oracle, nop }: { oracle?: CheckResult; nop?: CheckResult }) {
  const t = useT().editor.live
  const reason = useReason()
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {oracle && (
        <Chip
          tone={oracle.status === "pass" ? "good" : oracle.status === "fail" ? "bad" : "muted"}
          icon={oracle.status === "pass" ? CircleCheck : oracle.status === "fail" ? CircleX : CircleHelp}
          title={reason(oracle.reason)}
        >
          {t.oracle} {t[oracle.status]}
        </Chip>
      )}
      {nop && (
        <Chip
          // The nop agent failing a check is what a good check does; passing it is a warning.
          tone={nop.status === "fail" ? "good" : nop.status === "pass" ? "warn" : "muted"}
          icon={nop.status === "fail" ? CircleCheck : nop.status === "pass" ? TriangleAlert : CircleHelp}
          title={reason(nop.reason)}
        >
          {t.nop} {t[nop.status]}
        </Chip>
      )}
    </span>
  )
}

/** What happened to one step when the solution ran. */
export function StepBadge({ result }: { result?: StepResult }) {
  const t = useT().editor.live
  const reason = useReason()
  if (!result) return null
  const map = {
    ok: { tone: "good", icon: CircleCheck, text: t.ok },
    error: { tone: "bad", icon: CircleX, text: t.error },
    unknown: { tone: "muted", icon: CircleHelp, text: t.unknown },
    skipped: { tone: "muted", icon: MinusCircle, text: t.skipped },
  } as const
  const m = map[result.status]
  const why = reason(result.message)
  return (
    <Chip tone={m.tone} icon={m.icon} title={why}>
      {m.text}
      {result.status === "error" && why ? `: ${why}` : ""}
    </Chip>
  )
}
