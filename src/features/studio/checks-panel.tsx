"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Issue } from "@/features/task/issues"
import { cn } from "@/lib/utils"

function Command({ command, expect }: { command: string; expect: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-md bg-hull p-3 text-hull-ink">
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all text-code">{command}</code>
        <Button
          variant="ghost"
          size="icon"
          className="-m-1 size-7 shrink-0 text-hull-ink hover:bg-white/10 hover:text-hull-ink"
          aria-label="Copy command"
          onClick={() => {
            void navigator.clipboard.writeText(command)
            toast.success("Copied")
          }}
        >
          <Copy />
        </Button>
      </div>
      <div className="text-body-sm">{expect}</div>
    </li>
  )
}

interface ChecksPanelProps {
  issues: Issue[]
  dirName: string
  onSelectIssue: (issue: Issue) => void
}

export function ChecksPanel({ issues, dirName, onSelectIssue }: ChecksPanelProps) {
  const errors = issues.filter((i) => i.severity === "error").length
  const warnings = issues.length - errors

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="checks-heading">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="checks-heading" className="text-label uppercase text-ink-muted">
            Checks
          </h2>
          <span className="text-body-sm text-ink-muted">
            {errors} {errors === 1 ? "error" : "errors"} · {warnings} {warnings === 1 ? "warning" : "warnings"}
          </span>
        </div>
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 font-semibold text-pass">
            <span aria-hidden>✓</span> pass — ready to Launch
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {issues.map((issue, i) => (
              <li key={`${issue.code}-${i}`}>
                <button
                  type="button"
                  disabled={!issue.blockId && !issue.path}
                  title={issue.blockId ? "Open the part" : issue.path}
                  onClick={() => onSelectIssue(issue)}
                  className="flex w-full items-start gap-2 rounded-md border border-line bg-surface p-3 text-left text-body-sm enabled:hover:bg-surface-sunken"
                >
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      issue.severity === "error" ? "text-fail" : "text-warn",
                    )}
                  >
                    {issue.severity === "error" ? "✕ error" : "! warning"}
                  </span>
                  <span>{issue.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="verify-heading">
        <h2 id="verify-heading" className="text-label uppercase text-ink-muted">
          Verify with Harbor
        </h2>
        <p className="text-body-sm text-ink-muted">
          Unzip the launched task and run both agents. A good task scores 1 with the solution and 0
          without it.
        </p>
        <ul className="flex flex-col gap-2">
          <Command
            command={`harbor run -p ./${dirName} -a oracle`}
            expect={
              <span className="flex flex-wrap gap-x-3">
                <span>expects 1</span>
                <span className="text-hull-warn">! unverified</span>
              </span>
            }
          />
          <Command
            command={`harbor run -p ./${dirName} -a nop`}
            expect={
              <span className="flex flex-wrap gap-x-3">
                <span className="text-hull-tide">expected 0</span>
                <span className="text-hull-warn">! unverified</span>
              </span>
            }
          />
        </ul>
      </section>
    </div>
  )
}
