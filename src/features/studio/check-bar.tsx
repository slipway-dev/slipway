"use client"

import { ChevronUp, CircleCheck, CircleX, Copy, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Issue } from "@/features/task/issues"
import { useT } from "@/i18n/provider"
import { issueText } from "@/i18n/text"
import { cn } from "@/lib/utils"

function SeverityIcon({ severity, className }: { severity: Issue["severity"]; className?: string }) {
  return severity === "error" ? (
    <CircleX className={cn("size-4 shrink-0 text-fail", className)} aria-hidden />
  ) : (
    <TriangleAlert className={cn("size-4 shrink-0 text-warn", className)} aria-hidden />
  )
}

function IssueList({
  issues,
  onSelect,
  showClean = true,
}: {
  issues: Issue[]
  onSelect: (issue: Issue) => void
  showClean?: boolean
}) {
  const t = useT()
  if (issues.length === 0) {
    if (!showClean) return null
    return (
      <p className="flex items-center gap-2 text-body-sm font-semibold text-pass">
        <CircleCheck className="size-4" aria-hidden />
        {t.studio.checks.clean}
      </p>
    )
  }
  return (
    <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
      {issues.map((issue, i) => {
        const where = issue.path
        return (
          <li key={`${issue.code}-${i}`}>
            <button
              type="button"
              disabled={!issue.blockId && !issue.path}
              onClick={() => onSelect(issue)}
              className="flex w-full items-start gap-3 px-3 py-2 text-left text-body-sm enabled:hover:bg-surface-sunken"
            >
              <SeverityIcon severity={issue.severity} className="mt-0.5" />
              <span className="sr-only">{issue.severity === "error" ? t.studio.checks.error : t.studio.checks.warning}</span>
              <span className="min-w-0 flex-1">{issueText(t, issue)}</span>
              {where ? (
                <span className="shrink-0 font-mono text-code text-ink-muted">{where}</span>
              ) : (
                issue.blockId && <span className="shrink-0 text-ink-muted">{t.studio.file.openPart}</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Command({ command, expect }: { command: string; expect: React.ReactNode }) {
  const t = useT()
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <code className="min-w-0 flex-1 truncate text-code" title={command}>
        {command}
      </code>
      <span className="shrink-0 text-body-sm">{expect}</span>
      <Button
        variant="ghost"
        size="icon"
        className="-my-1 size-7 shrink-0 text-hull-muted hover:bg-white/10 hover:text-hull-ink"
        aria-label={t.common.copyCommand}
        onClick={() => {
          void navigator.clipboard.writeText(command)
          toast.success(t.common.copied)
        }}
      >
        <Copy />
      </Button>
    </li>
  )
}

/** The Harbor commands that settle what lint cannot: does oracle score 1 and nop 0. */
function Verify({ dirName }: { dirName: string }) {
  const t = useT()
  const c = t.studio.checks
  return (
    <section className="flex flex-col gap-2" aria-labelledby="verify-heading">
      <h3 id="verify-heading" className="text-body-sm font-semibold">
        {c.verify}
      </h3>
      <p className="text-body-sm text-ink-muted">{c.verifyHelp}</p>
      <ul className="flex flex-col divide-y divide-white/10 rounded-md bg-hull text-hull-ink">
        <Command
          command={`harbor run -p ./${dirName} -a oracle`}
          expect={
            <>
              {c.expects1} <span className="text-hull-muted">· {c.unverified}</span>
            </>
          }
        />
        <Command
          command={`harbor run -p ./${dirName} -a nop`}
          expect={
            <>
              {c.expected0} <span className="text-hull-muted">· {c.unverified}</span>
            </>
          }
        />
      </ul>
    </section>
  )
}

interface CheckBarProps {
  issues: Issue[]
  dirName: string
  onSelectIssue: (issue: Issue) => void
}

/** Checks laid out for a narrow screen, where they get a tab of their own. */
export function ChecksPanel({ issues, dirName, onSelectIssue }: CheckBarProps) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <IssueList issues={issues} onSelect={onSelectIssue} />
      <Verify dirName={dirName} />
    </div>
  )
}

/**
 * Always-visible strip along the bottom of the workbench: the lint verdict
 * and the first problem at a glance, everything else one click away.
 */
export function CheckBar({ issues, dirName, onSelectIssue }: CheckBarProps) {
  const t = useT()
  const c = t.studio.checks
  const [open, setOpen] = useState(false)
  const errors = issues.filter((i) => i.severity === "error").length
  const first = issues.find((i) => i.severity === "error") ?? issues[0]

  return (
    <section aria-label={c.title} className="shrink-0 border-t border-line bg-surface">
      <div className="flex h-10 items-center gap-4 px-4 text-body-sm">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="check-details"
          onClick={() => setOpen(!open)}
          className="flex shrink-0 items-center gap-2 rounded-sm font-semibold"
        >
          {issues.length === 0 ? (
            <CircleCheck className="size-4 text-pass" aria-hidden />
          ) : (
            <SeverityIcon severity={errors ? "error" : "warning"} />
          )}
          <span className={cn(issues.length === 0 && "text-pass")}>
            {issues.length === 0 ? c.clean : c.counts(errors, issues.length - errors)}
          </span>
        </button>
        {first && (
          <button
            type="button"
            onClick={() => onSelectIssue(first)}
            className="min-w-0 flex-1 truncate rounded-sm text-left text-ink-muted hover:text-ink"
          >
            {issueText(t, first)}
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0"
          aria-expanded={open}
          aria-controls="check-details"
          onClick={() => setOpen(!open)}
        >
          {open ? c.hide : c.showAll}
          <ChevronUp className={cn("transition-transform", !open && "rotate-180")} />
        </Button>
      </div>
      {open && (
        <div
          id="check-details"
          className={cn(
            "grid max-h-[40vh] items-start gap-6 overflow-y-auto border-t border-line px-4 py-4",
            issues.length > 0 && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
          )}
        >
          <IssueList issues={issues} onSelect={onSelectIssue} showClean={false} />
          <div className="max-w-3xl">
            <Verify dirName={dirName} />
          </div>
        </div>
      )}
    </section>
  )
}
