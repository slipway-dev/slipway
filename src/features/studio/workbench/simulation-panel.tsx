"use client"

import { ChevronDown, CircleCheck, CircleHelp, CircleX, Copy, Plus, Trash2, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isFlowValue, makeNode, newNodeId, type FlowNode } from "@/features/flow/types"
import { checkedPaths } from "@/features/task/hints"
import type { Scenario, TaskProject } from "@/features/task/model"
import type { Outcome, SimRun, TaskSimulation } from "@/features/task/simulate"
import { useStudio } from "@/features/task/store"
import type { Messages } from "@/i18n/messages"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { FlowEditor } from "./flow-editor"
import { StepBadge } from "./live"
import { nodeTitle } from "./node-title"

const OUTCOME_ICON: Record<Outcome, typeof CircleCheck> = {
  "as-expected": CircleCheck,
  unexpected: TriangleAlert,
  error: CircleX,
  unknown: CircleHelp,
}
const OUTCOME_TONE: Record<Outcome, string> = {
  "as-expected": "text-pass",
  unexpected: "text-warn",
  error: "text-fail",
  unknown: "text-ink-muted",
}

function outcomeText(t: Messages, run: SimRun): string {
  const reward = run.reward === undefined ? t.blueprint.simUnknown : String(run.reward)
  if (run.kind === "oracle") return run.unavailable ? t.sim.oracleUnavailable : t.sim.outcome.oracle[run.outcome](reward)
  if (run.kind === "nop") return t.sim.outcome.nop[run.outcome](reward)
  return t.sim.outcome.scenario[run.outcome](reward, run.expect)
}

function CommandLine({ command }: { command: string }) {
  const t = useT()
  return (
    <div className="flex items-start gap-2 rounded-lg bg-hull p-3 text-hull-ink">
      <code className="min-w-0 flex-1 text-code break-all">{command}</code>
      <button
        type="button"
        aria-label={t.common.copyCommand}
        className="rounded-sm p-0.5 text-hull-muted hover:text-hull-ink"
        onClick={() => {
          void navigator.clipboard.writeText(command)
          toast.success(t.common.copied)
        }}
      >
        <Copy className="size-4" />
      </button>
    </div>
  )
}

function Results({ run, simulation, stepNodes }: { run: SimRun; simulation: TaskSimulation; stepNodes: FlowNode[] }) {
  const t = useT()
  const live = t.editor.live
  const reason = (r?: string) => (r ? (t.editor.reasons[r] ?? r) : "")
  return (
    <div className="flex flex-col gap-4 text-body-sm">
      {run.steps.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-label text-ink-muted">{t.sim.stepsHeading}</h4>
          <ul className="flex flex-col gap-1">
            {run.steps.map((step) => {
              const node = stepNodes.find((n) => n.id === step.id)
              return (
                <li key={step.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{node ? nodeTitle(t, "steps", node) : step.id}</span>
                  <StepBadge result={step} />
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-1.5">
        <h4 className="text-label text-ink-muted">{t.sim.checksHeading}</h4>
        <ul className="flex flex-col gap-1">
          {run.checks.map((check) => {
            const node = simulation.checks.find((n) => n.id === check.id)
            const Icon = check.status === "pass" ? CircleCheck : check.status === "fail" ? CircleX : CircleHelp
            const tone = check.status === "pass" ? "text-pass" : check.status === "fail" ? "text-fail" : "text-ink-muted"
            return (
              <li key={check.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate">{node ? nodeTitle(t, "checks", node) : check.id}</span>
                <span className={cn("flex items-center gap-1 whitespace-nowrap", tone)}>
                  <Icon className="size-3.5" aria-hidden />
                  {live[check.status]}
                  {check.reason && check.status !== "pass" ? ` · ${reason(check.reason)}` : ""}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="flex flex-col gap-1.5">
        <h4 className="text-label text-ink-muted">{t.sim.changed}</h4>
        {run.changes.length === 0 ? (
          <p className="text-ink-muted">{t.sim.nothingChanged}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {run.changes.map((c) => (
              <li key={c.path} className="flex items-center justify-between gap-2">
                <code className="min-w-0 truncate font-mono text-code">{c.path}</code>
                <span className="text-ink-muted">{t.sim[c.change]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface RunCardProps {
  run: SimRun
  simulation: TaskSimulation
  stepNodes: FlowNode[]
  /** Scenarios can be edited and removed; the oracle and nop cannot. */
  scenario?: Scenario
  project: TaskProject
  pathSuggestions: string[]
}

function RunCard({ run, simulation, stepNodes, scenario, project, pathSuggestions }: RunCardProps) {
  const t = useT()
  const updateProject = useStudio((s) => s.updateProject)
  // A scenario with no name yet was just added; open it so it can be filled in.
  const [open, setOpen] = useState(Boolean(scenario && scenario.name === ""))
  const Icon = OUTCOME_ICON[run.outcome]
  const name = scenario ? scenario.name || t.sim.scenarios.defaultName : run.kind === "oracle" ? t.sim.oracleName : t.sim.nopName
  const hint = run.kind === "oracle" ? t.sim.oracleHint : run.kind === "nop" ? t.sim.nopHint : undefined
  const bodyId = `run-${run.id}`

  const edit = (change: (s: Scenario) => void) =>
    updateProject(project.id, (p) => {
      const target = p.scenarios?.find((s) => s.id === run.id)
      if (target) change(target)
    })

  return (
    <li className="rounded-xl border border-line bg-surface">
      <div className="flex items-start gap-3 p-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", OUTCOME_TONE[run.outcome])} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn("font-semibold", !scenario && "font-mono text-code")}>{name}</span>
            {hint && <span className="text-body-sm text-ink-muted">{hint}</span>}
            <span className="ml-auto font-mono text-code tabular-nums text-ink-muted">
              {run.reward === undefined ? t.sim.unknownReward : t.sim.reward(run.reward)}
            </span>
          </div>
          <p className="text-body-sm">{outcomeText(t, run)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t.sim.scenarios.collapse : t.sim.scenarios.expand}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={cn("transition-transform", !open && "-rotate-90")} />
        </Button>
      </div>
      {open && (
        <div id={bodyId} className="flex flex-col gap-5 border-t border-line p-3">
          {scenario && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${run.id}-name`}>{t.sim.scenarios.name}</Label>
                  <Input
                    id={`${run.id}-name`}
                    value={scenario.name}
                    placeholder={t.sim.scenarios.namePlaceholder}
                    onChange={(e) => edit((s) => void (s.name = e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t.sim.scenarios.expect}</Label>
                  <Select value={scenario.expect} onValueChange={(v) => edit((s) => void (s.expect = v as Scenario["expect"]))}>
                    <SelectTrigger className="w-full sm:w-32" aria-label={t.sim.scenarios.expect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">{t.sim.scenarios.pass}</SelectItem>
                      <SelectItem value="fail">{t.sim.scenarios.fail}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t.sim.scenarios.steps}</Label>
                <FlowEditor
                  kind="steps"
                  bare
                  value={{ nodes: scenario.steps }}
                  pathSuggestions={pathSuggestions}
                  onChange={(value) => edit((s) => void (s.steps = value.nodes))}
                  status={(node) => <StepBadge result={run.steps.find((r) => r.id === node.id)} />}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-fail hover:text-fail"
                onClick={() =>
                  updateProject(project.id, (p) => void (p.scenarios = (p.scenarios ?? []).filter((s) => s.id !== run.id)))
                }
              >
                <Trash2 />
                {t.sim.scenarios.remove(name)}
              </Button>
            </div>
          )}
          <Results run={run} simulation={simulation} stepNodes={stepNodes} />
        </div>
      )}
    </li>
  )
}

interface SimulationPanelProps {
  project: TaskProject
  simulation: TaskSimulation
  dirName: string
  pathSuggestions: string[]
}

/**
 * What the simulator makes of the task: the oracle, the nop agent and the
 * author's own what-ifs, each with the outcome in a sentence and the
 * details behind it. Scenarios are edited here, with the same step editor
 * the solution uses.
 */
export function SimulationPanel({ project, simulation, dirName, pathSuggestions }: SimulationPanelProps) {
  const t = useT()
  const updateProject = useStudio((s) => s.updateProject)

  if (simulation.unsupported === "no-verifier") {
    return <p className="rounded-xl border border-dashed border-line-strong p-4 text-body-sm text-ink-muted">{t.sim.noVerifier}</p>
  }

  if (!simulation.supported) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <h3 className="font-semibold">{t.sim.unsupportedTitle}</h3>
        <p className="text-body-sm text-ink-muted">{t.sim.unsupportedBody}</p>
        <CommandLine command={`harbor run -p ./${dirName} -a oracle`} />
        <CommandLine command={`harbor run -p ./${dirName} -a nop`} />
      </div>
    )
  }

  const solutionFlow = project.blocks.solution.find((b) => !b.disabled && b.partId === "slipway/solution-steps")?.params.flow
  const solutionNodes = isFlowValue(solutionFlow) ? solutionFlow.nodes : []
  const scenarios = project.scenarios ?? []

  function addScenario() {
    const path = checkedPaths(project)[0] ?? "/app/"
    const scenario: Scenario = {
      id: newNodeId(),
      name: "",
      expect: "fail",
      steps: [makeNode("steps", "write-file", { path, content: "" })],
    }
    updateProject(project.id, (p) => void (p.scenarios = [...(p.scenarios ?? []), scenario]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h3 className="flex items-center gap-2 font-semibold">
          {t.sim.title}
          <span className="rounded-sm border border-line px-1.5 text-label font-normal text-ink-muted">{t.sim.simulated}</span>
        </h3>
        <p className="max-w-prose text-body-sm text-ink-muted">{t.sim.lede}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {simulation.runs
          .filter((r) => r.kind !== "scenario")
          .map((run) => (
            <RunCard
              key={run.id}
              run={run}
              simulation={simulation}
              stepNodes={solutionNodes}
              project={project}
              pathSuggestions={pathSuggestions}
            />
          ))}
      </ul>

      <section className="flex flex-col gap-3" aria-labelledby="whatifs">
        <div className="flex flex-col gap-1">
          <h3 id="whatifs" className="font-semibold">
            {t.sim.scenarios.title}
          </h3>
          <p className="max-w-prose text-body-sm text-ink-muted">{t.sim.scenarios.lede}</p>
        </div>
        {scenarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-4 text-body-sm text-ink-muted">{t.sim.scenarios.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {scenarios.map((scenario) => {
              const run = simulation.runs.find((r) => r.id === scenario.id)
              return run ? (
                <RunCard
                  key={scenario.id}
                  run={run}
                  scenario={scenario}
                  simulation={simulation}
                  stepNodes={scenario.steps}
                  project={project}
                  pathSuggestions={pathSuggestions}
                />
              ) : null
            })}
          </ul>
        )}
        <Button variant="outline" size="sm" className="self-start" onClick={addScenario}>
          <Plus />
          {t.sim.scenarios.add}
        </Button>
      </section>
    </div>
  )
}
