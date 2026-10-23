"use client"

import { Download, X } from "lucide-react"
import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseTrajectory, type ParsedTrajectory } from "@/features/runs/atif"
import { auditTrajectory } from "@/features/runs/audit"
import { parseCtrf, type CtrfReport } from "@/features/runs/ctrf"
import { readJson, type FileSet } from "@/features/runs/files"
import { formatCost, formatDuration, formatReward, formatTokens } from "@/features/runs/format"
import { seconds, trajectoryPath, trialRoot, type TrialSummary } from "@/features/runs/job"
import { annotationKey, loadJob, useRuns } from "@/features/runs/store"
import { downloadBytes } from "@/features/studio/download"
import { useT } from "@/i18n/provider"
import { trajectoryProblemText } from "@/i18n/text"
import { cn } from "@/lib/utils"

import { AnnotationEditor } from "./annotation-editor"
import { Figure } from "./job-view"
import { FindingCounts, RewardValue, StatusLabel } from "./status"
import { TextBlock } from "./text-block"
import { TrajectoryView } from "./trajectory-view"

const NO_FILES: FileSet = new Map()

/** Reads a file once per Blob, so tabs and re-renders share the promise. */
const textCache = new WeakMap<Blob, Promise<string>>()
function useFileText(files: FileSet, path: string): string | undefined | null {
  const [state, setState] = useState<{ path: string; text: string | null }>()
  useEffect(() => {
    const blob = files.get(path)
    if (!blob) return
    let promise = textCache.get(blob)
    if (!promise) {
      promise = blob.text()
      textCache.set(blob, promise)
    }
    let live = true
    void promise.then((text) => live && setState({ path, text }))
    return () => {
      live = false
    }
  }, [files, path])
  if (!files.has(path)) return null
  return state?.path === path ? state.text : undefined
}

const PHASES = ["environment_setup", "agent_setup", "agent_execution", "verifier"] as const

function Timeline({ trial }: { trial: TrialSummary }) {
  const t = useT().runs.trial
  const result = trial.result
  if (!result) return null
  const phases = PHASES.flatMap((key) => {
    const label = t.phases[key]
    const sec = seconds(result[key])
    return sec === undefined ? [] : [{ key, label, sec }]
  })
  const total = phases.reduce((a, p) => a + p.sec, 0)
  if (!total) return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-1.5 overflow-hidden rounded-sm bg-surface-sunken" aria-hidden>
        {phases.map((p) => (
          <div
            key={p.key}
            style={{ width: `${(p.sec / total) * 100}%` }}
            className={cn(p.key === "agent_execution" ? "bg-tide" : p.key === "verifier" ? "bg-signal" : "bg-line-strong", "border-r border-surface last:border-0")}
          />
        ))}
      </div>
      <dl aria-label={t.phaseTimeline} className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
        {phases.map((p) => (
          <div key={p.key} className="flex gap-1">
            <dt className="text-ink-muted">{p.label}</dt>
            <dd className="font-semibold tabular-nums">{formatDuration(p.sec)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function VerifierTab({ files, root, trial }: { files: FileSet; root: string; trial: TrialSummary }) {
  const stdout = useFileText(files, `${root}/verifier/test-stdout.txt`)
  const stderr = useFileText(files, `${root}/verifier/test-stderr.txt`)
  const [ctrf, setCtrf] = useState<CtrfReport | undefined>()
  useEffect(() => {
    void readJson(files, `${root}/verifier/ctrf.json`).then((json) => setCtrf(parseCtrf(json)))
  }, [files, root])
  const rewards = Object.entries(trial.rewards)
  const t = useT().runs.trial

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-label font-medium text-ink-muted">{t.rewards}</h3>
        {rewards.length ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            {rewards.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="font-mono text-body-sm text-ink-muted">{key}</dt>
                <dd className="text-title font-semibold tabular-nums">{formatReward(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-body-sm text-ink-muted">{t.noReward}</p>
        )}
      </section>
      {ctrf && (
        <section className="flex flex-col gap-2">
          <h3 className="text-label font-medium text-ink-muted">{t.tests(ctrf.tool)}</h3>
          <ul className="flex flex-col gap-1">
            {ctrf.tests.map((test) => (
              <li key={test.name} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface p-2 text-body-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold",
                      test.status === "passed" ? "text-pass" : test.status === "failed" ? "text-fail" : "text-warn",
                    )}
                  >
                    {t.testStatus[test.status] ?? test.status}
                  </span>
                  <code className="font-mono break-all">{test.name}</code>
                </span>
                {test.message && <code className="font-mono text-ink-muted break-all">{test.message}</code>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {[["test-stdout.txt", stdout], ["test-stderr.txt", stderr]].map(
        ([name, text]) =>
          text != null && (
            <section key={name} className="flex flex-col gap-2">
              <h3 className="font-mono text-code text-ink-muted">verifier/{name}</h3>
              <TextBlock text={text || t.empty} code maxLines={40} />
            </section>
          ),
      )}
    </div>
  )
}

function FilesTab({ files, trial }: { files: FileSet; trial: string }) {
  const paths = useMemo(() => [...files.keys()].filter((p) => p.startsWith(`${trial}/`)).sort(), [files, trial])
  const [selected, setSelected] = useState(paths[0])
  const text = useFileText(files, selected ?? "")
  const blob = selected ? files.get(selected) : undefined
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(selected ?? "")
  const t = useT().runs.trial
  const common = useT().common

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <ul className="flex flex-col">
        {paths.map((path) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => setSelected(path)}
              aria-current={path === selected ? "true" : undefined}
              className={cn(
                "flex w-full justify-between gap-2 rounded-sm px-2 py-1 text-left font-mono text-code hover:bg-surface",
                path === selected && "bg-surface font-semibold",
              )}
            >
              <span className="truncate">{path.slice(trial.length + 1)}</span>
              <span className="shrink-0 font-sans text-body-sm text-ink-muted">{formatTokens(files.get(path)?.size)}B</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="min-w-0">
        {!selected ? null : isImage ? (
          <p className="text-body-sm text-ink-muted">{t.imageInline}</p>
        ) : blob && blob.size > 2_000_000 ? (
          <p className="text-body-sm text-ink-muted">{t.tooLarge(formatTokens(blob.size))}</p>
        ) : text === undefined ? (
          <p className="text-body-sm text-ink-muted">{common.loading}</p>
        ) : (
          <TextBlock text={text || t.emptyFile} code maxLines={200} />
        )}
      </div>
    </div>
  )
}

export function TrialView({ jobId, trialName }: { jobId: string; trialName: string }) {
  const messages = useT()
  const tr = messages.runs
  const t = tr.trial
  const job = use(loadJob(jobId))
  const jobName = useRuns((s) => s.jobs[jobId]?.name)
  const annotations = useRuns((s) => s.annotations)
  const trial = job?.index.trials.find((t) => t.name === trialName)
  const [step, setStep] = useState<string | undefined>(trial?.stepNames[0])
  const files = job?.files
  const trajectoryText = useFileText(files ?? NO_FILES, trajectoryPath(trialName, step))

  const parsed: ParsedTrajectory | undefined = useMemo(
    () => (trajectoryText ? parseTrajectory(trajectoryText) : undefined),
    [trajectoryText],
  )
  const findings = useMemo(() => (parsed?.trajectory ? auditTrajectory(parsed.trajectory) : []), [parsed])

  if (!job || !trial || !files) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p>{t.notSaved}</p>
        <Link href="/runs" className="text-tide underline-offset-4 hover:underline">
          {tr.backToRuns}
        </Link>
      </div>
    )
  }

  const root = trialRoot(trialName, step)
  const exception = trial.result?.exception_info

  function exportAudit() {
    const prefix = `${jobId}::${trialName}::`
    const report = {
      format: "slipway-audit/v1",
      job: { id: jobId, name: jobName },
      trial: { name: trialName, task: trial!.taskName, agent: trial!.agent, model: trial!.model, rewards: trial!.rewards, status: trial!.status },
      findings,
      annotations: Object.fromEntries(
        Object.entries(annotations)
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, value]) => [key.slice(prefix.length), value]),
      ),
    }
    downloadBytes(new TextEncoder().encode(JSON.stringify(report, null, 2)), `${trialName}.audit.json`, "application/json")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <nav aria-label={tr.breadcrumb} className="flex flex-wrap gap-1 text-body-sm text-ink-muted">
          <Link href="/runs" className="hover:text-ink">
            {tr.title}
          </Link>
          /
          <Link href={`/runs/${jobId}`} className="font-mono hover:text-ink">
            {jobName ?? jobId}
          </Link>
          /
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-mono text-title font-semibold break-all">{trialName}</h1>
          <Button variant="outline" size="sm" onClick={exportAudit}>
            <Download />
            {t.exportAudit}
          </Button>
        </div>
        <p className="text-body-sm text-ink-muted">
          {[trial.taskName, `${trial.agent}${trial.result?.agent_info?.version ? ` ${trial.result.agent_info.version}` : ""}`, trial.model]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex flex-col gap-3 border-y border-line py-3">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap">
          <Figure
            label={t.result}
            value={
              <span className="flex items-center gap-3">
                <StatusLabel status={trial.status} />
                <RewardValue value={trial.reward} />
              </span>
            }
          />
          <Figure
            label={t.audit}
            value={
              parsed?.trajectory ? (
                <FindingCounts findings={findings} />
              ) : (
                <span className="text-body-sm font-normal text-ink-muted">{t.noTrajectory}</span>
              )
            }
          />
          <Figure label={t.duration} value={formatDuration(trial.durationSec)} />
          <Figure label={t.cost} value={formatCost(trial.costUsd)} />
        </dl>
        <Timeline trial={trial} />
      </div>

      {exception && (
        <section className="flex flex-col gap-2 rounded-xl border border-fail bg-surface p-4">
          <p className="flex items-start gap-2">
            <X className="mt-1 size-4 shrink-0 text-fail" strokeWidth={2.5} aria-hidden />
            <span>
              <span className="font-mono text-code font-semibold text-fail">{exception.exception_type}</span>{" "}
              {exception.exception_message}
            </span>
          </p>
          {exception.exception_traceback && (
            <details>
              <summary className="cursor-pointer text-body-sm text-ink-muted">{t.traceback}</summary>
              <TextBlock text={exception.exception_traceback} code maxLines={30} className="mt-2" />
            </details>
          )}
        </section>
      )}

      <section className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-body-sm font-semibold">{t.verdictHeading}</h2>
        <AnnotationEditor annotationKey={annotationKey(jobId, trialName, "", "trial")} />
      </section>

      {trial.stepNames.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-ink-muted">{t.step}</span>
          <Select value={step} onValueChange={setStep}>
            <SelectTrigger className="w-56" aria-label={t.stepLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trial.stepNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="trajectory" className="gap-4">
        <TabsList>
          <TabsTrigger value="trajectory">{t.tabs.trajectory}</TabsTrigger>
          <TabsTrigger value="verifier">{t.tabs.verifier}</TabsTrigger>
          <TabsTrigger value="files">{t.tabs.files}</TabsTrigger>
        </TabsList>
        <TabsContent value="trajectory">
          {trajectoryText === null ? (
            <p className="text-body-sm text-ink-muted">
              {t.noTrajectoryBody.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
            </p>
          ) : trajectoryText === undefined ? (
            <p className="text-body-sm text-ink-muted">{t.loadingTrajectory}</p>
          ) : parsed?.error ? (
            <p className="flex items-center gap-2 text-fail">
              <X className="size-4" aria-hidden />
              {trajectoryProblemText(messages, parsed.error)}
            </p>
          ) : (
            parsed?.trajectory && (
              <TrajectoryView
                root={parsed.trajectory}
                warnings={parsed.warnings}
                findings={findings}
                jobId={jobId}
                trial={trialName}
                baseDir={`${root}/agent`}
                files={files}
              />
            )
          )}
        </TabsContent>
        <TabsContent value="verifier">
          <VerifierTab files={files} root={root} trial={trial} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab files={files} trial={trialName} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
