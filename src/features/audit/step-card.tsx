"use client"

import { Badge } from "@/components/ui/badge"
import { contentText, pairToolCalls } from "@/features/runs/atif"
import type { Finding } from "@/features/runs/audit"
import { formatCost, formatOffset, formatTokens } from "@/features/runs/format"
import type { Content, ObservationResult, Step, ToolCall } from "@/features/runs/types"
import { cn } from "@/lib/utils"

import { AnnotationEditor } from "./annotation-editor"
import { SeverityGlyph } from "./status"
import { TextBlock } from "./text-block"

/** Argument keys agents use for the command itself, shown as code rather than as a field. */
const COMMAND_KEYS = ["command", "keystrokes", "cmd", "code", "script", "input"]

/** One object URL per image Blob for the session; a trajectory has few enough images not to matter. */
const imageUrls = new WeakMap<Blob, string>()

function ImagePart({ path, resolve }: { path: string; resolve: (path: string) => Blob | undefined }) {
  const blob = resolve(path)
  let url = blob ? imageUrls.get(blob) : undefined
  if (blob && !url) {
    url = URL.createObjectURL(blob)
    imageUrls.set(blob, url)
  }
  if (!url) return <p className="text-body-sm text-ink-muted">Image not in the import: {path}</p>
  // eslint-disable-next-line @next/next/no-img-element -- local object URL, not an optimizable asset
  return <img src={url} alt={`Screenshot ${path}`} className="max-h-96 rounded-md border border-line" />
}

function ContentView({
  content,
  resolve,
  code = false,
}: {
  content: Content | null | undefined
  resolve: (path: string) => Blob | undefined
  code?: boolean
}) {
  if (content == null || content === "") return null
  if (typeof content === "string") return <TextBlock text={content} code={code} />
  return (
    <div className="flex flex-col gap-2">
      {content.map((part, i) =>
        part.type === "image" && part.source ? (
          <ImagePart key={i} path={part.source.path} resolve={resolve} />
        ) : (
          <TextBlock key={i} text={part.type === "text" ? (part.text ?? "") : contentText([part])} code={code} />
        ),
      )}
    </div>
  )
}

function ToolCallView({
  call,
  results,
  findings,
  resolve,
  onOpenSubagent,
}: {
  call: ToolCall
  results: ObservationResult[]
  findings: Finding[]
  resolve: (path: string) => Blob | undefined
  onOpenSubagent: (trajectoryId: string) => void
}) {
  const args = call.arguments ?? {}
  const commandKey = COMMAND_KEYS.find((k) => typeof args[k] === "string")
  const rest = Object.entries(args).filter(([k]) => k !== commandKey)
  const flagged = findings.filter((f) => f.toolCallId === call.tool_call_id)

  return (
    <div className={cn("flex flex-col gap-2 rounded-md border border-line p-3", flagged.length && "border-line-strong")}>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-code font-semibold">{call.function_name}</code>
        {flagged.map((f) => (
          <span key={f.rule} className="text-body-sm">
            <SeverityGlyph severity={f.severity} /> <span className="text-ink-muted">{f.rule}</span>
          </span>
        ))}
      </div>
      {commandKey && <TextBlock text={String(args[commandKey]).replace(/\n$/, "")} code maxLines={10} />}
      {rest.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
          {rest.map(([key, value]) => {
            const text = typeof value === "string" ? value : JSON.stringify(value, null, 2)
            return (
              <div key={key} className="contents">
                <dt className="font-mono text-ink-muted">{key}</dt>
                <dd className="min-w-0">
                  {text.includes("\n") || text.length > 120 ? (
                    <TextBlock text={text} code maxLines={8} />
                  ) : (
                    <code className="font-mono break-all">{text}</code>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
      {results.map((result, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-label uppercase text-ink-muted">Result</span>
          <ContentView content={result.content} resolve={resolve} code />
          {result.subagent_trajectory_ref?.map((ref) =>
            ref.trajectory_id ? (
              <button
                key={ref.trajectory_id}
                type="button"
                onClick={() => onOpenSubagent(ref.trajectory_id!)}
                className="self-start rounded-sm text-body-sm text-tide underline-offset-4 hover:underline"
              >
                Open subagent {ref.trajectory_id} →
              </button>
            ) : (
              <span key={ref.trajectory_path} className="text-body-sm text-ink-muted">
                Subagent trajectory in {ref.trajectory_path}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  )
}

interface StepCardProps {
  step: Step
  anchorId: string
  startTime?: number
  defaultModel?: string | null
  findings: Finding[]
  annotationKey: string
  resolve: (path: string) => Blob | undefined
  onOpenSubagent: (trajectoryId: string) => void
}

export function StepCard({
  step,
  anchorId,
  startTime,
  defaultModel,
  findings,
  annotationKey,
  resolve,
  onOpenSubagent,
}: StepCardProps) {
  const { pairs, unpaired } = pairToolCalls(step)
  const m = step.metrics
  const offset = formatOffset(step.timestamp, startTime)
  const stepFindings = findings.filter((f) => !f.toolCallId)
  const callFindings = findings.filter((f) => f.toolCallId)

  return (
    <article
      id={anchorId}
      aria-labelledby={`${anchorId}-title`}
      className={cn(
        "flex scroll-mt-4 flex-col gap-3 rounded-md border bg-surface p-4 [content-visibility:auto] [contain-intrinsic-size:auto_320px]",
        findings.some((f) => f.severity === "error") ? "border-fail" : "border-line",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={`${anchorId}-title`} className="font-mono text-code font-semibold">
          #{step.step_id}
        </h3>
        <Badge variant={step.source === "agent" ? "secondary" : "outline"} className="text-label uppercase">
          {step.source}
        </Badge>
        {step.is_copied_context && <Badge variant="outline">copied context</Badge>}
        {offset && <span className="font-mono text-body-sm text-ink-muted">{offset}</span>}
        {step.model_name && step.model_name !== defaultModel && (
          <span className="text-body-sm text-ink-muted">{step.model_name}</span>
        )}
        {m && (m.prompt_tokens || m.completion_tokens || m.cost_usd) ? (
          <span className="ml-auto text-body-sm text-ink-muted tabular-nums">
            {formatTokens(m.prompt_tokens)} in · {formatTokens(m.completion_tokens)} out
            {m.cost_usd ? ` · ${formatCost(m.cost_usd)}` : ""}
          </span>
        ) : null}
      </header>

      {findings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md bg-surface-sunken p-3 text-body-sm">
          {[...stepFindings, ...callFindings].map((f, i) => (
            <li key={`${f.rule}-${i}`} className="flex flex-col gap-0.5">
              <span>
                <SeverityGlyph severity={f.severity} /> {f.message}
              </span>
              {f.evidence && <code className="font-mono break-all text-ink-muted">{f.evidence}</code>}
            </li>
          ))}
        </ul>
      )}

      <ContentView content={step.message} resolve={resolve} />

      {step.reasoning_content && (
        <details className="rounded-md bg-surface-sunken p-3">
          <summary className="cursor-pointer text-body-sm font-semibold text-ink-muted">Reasoning</summary>
          <TextBlock text={step.reasoning_content} className="mt-2 text-ink-muted" />
        </details>
      )}

      {pairs.map(({ call, results }) => (
        <ToolCallView
          key={call.tool_call_id}
          call={call}
          results={results}
          findings={callFindings}
          resolve={resolve}
          onOpenSubagent={onOpenSubagent}
        />
      ))}

      {unpaired.map((result, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-label uppercase text-ink-muted">
            {pairs.length > 1 ? "Output of the calls above" : "Output"}
          </span>
          <ContentView content={result.content} resolve={resolve} code />
        </div>
      ))}

      {step.source === "agent" && (
        <footer className="border-t border-line pt-3">
          <AnnotationEditor annotationKey={annotationKey} compact />
        </footer>
      )}
    </article>
  )
}
