import { runChecks, runSteps, type CheckResult, type StepResult } from "@/features/flow/simulate"
import { isFlowValue, type FlowNode, type FlowValue, type RewardMode } from "@/features/flow/types"
import { basename, cloneVFS, createVFS, mkdirP, normalizePath, parentOf, type VFS } from "@/features/flow/vfs"
import type { Block, ParamValue } from "@/features/parts/types"

import type { TaskProject } from "./model"

/**
 * What would happen if the oracle, the nop agent or an imagined agent ran
 * this task? Answered in the browser, without Docker, for tasks whose
 * verifier is a list of Checks. Anything only a real shell can say is
 * reported as unknown, never guessed.
 */

export type RunKind = "oracle" | "nop" | "scenario"

/** as-expected: it did what a good task does. unexpected: it did not. unknown: needs a real run. error: a step failed. */
export type Outcome = "as-expected" | "unexpected" | "unknown" | "error"

export interface FileChange {
  path: string
  change: "created" | "modified" | "deleted"
}

export interface SimRun {
  /** "oracle", "nop" or the scenario's id. */
  id: string
  kind: RunKind
  name?: string
  /** Whether a good verifier passes (reward 1) or fails this run. */
  expect: "pass" | "fail"
  steps: StepResult[]
  checks: CheckResult[]
  /** Undefined when something could not be decided. */
  reward?: number
  /** Why the run has no result, when it has none. */
  unavailable?: "no-solution-steps"
  /** The step where the script stopped with an error. */
  failedAt?: string
  outcome: Outcome
  changes: FileChange[]
}

export interface TaskSimulation {
  /** False unless the verifier is a Checks part, the only verifier Slipway can run itself. */
  supported: boolean
  /** The checks, the way the verifier will run them. */
  checks: FlowNode[]
  rewardMode: RewardMode
  /** The files the task starts with, as far as Slipway knows them. */
  initial: VFS
  runs: SimRun[]
}

const ENV_FILE = "slipway/environment-file"
const BASE_IMAGE = "slipway/base-image"
const CHECKS = "slipway/checks"
const STEPS = "slipway/solution-steps"

const active = (blocks: Block[], partId: string): Block | undefined =>
  blocks.find((b) => b.partId === partId && !b.disabled)

function text(value: ParamValue | undefined): string {
  return typeof value === "string" ? value : ""
}

function flowOf(block: Block | undefined): FlowValue | undefined {
  const value = block?.params.flow
  return isFlowValue(value) ? value : undefined
}

/**
 * The filesystem the agent starts with: the directory the image starts in
 * and the data files declared by File parts, placed the way `COPY` would.
 * Files added any other way (a hand-written Dockerfile, a build script) are
 * outside what Slipway knows.
 */
export function initialFilesystem(project: TaskProject): VFS {
  const vfs = createVFS()
  const workdir = normalizePath(text(active(project.blocks.environment, BASE_IMAGE)?.params.workdir) || "/") ?? "/"
  mkdirP(vfs, workdir)

  for (const block of project.blocks.environment) {
    if (block.disabled || block.partId !== ENV_FILE) continue
    const source = text(block.params.path).trim()
    const destination = text(block.params.destination).trim()
    if (!source || !destination) continue
    const absolute = destination.startsWith("/") ? destination : `${workdir}/${destination}`
    const target = normalizePath(absolute)
    if (!target) continue
    const intoDir = destination.endsWith("/") || vfs.dirs.has(target)
    const path = intoDir ? `${target === "/" ? "" : target}/${basename(source)}` : target
    // COPY creates the parent directories; it does not add the trailing newline a heredoc would.
    if (mkdirP(vfs, parentOf(path)) === undefined && !vfs.dirs.has(path)) {
      vfs.files.set(path, text(block.params.content))
    }
  }
  return vfs
}

function diff(before: VFS, after: VFS): FileChange[] {
  const changes: FileChange[] = []
  for (const [path, content] of after.files) {
    if (!before.files.has(path)) changes.push({ path, change: "created" })
    else if (before.files.get(path) !== content) changes.push({ path, change: "modified" })
  }
  for (const path of before.files.keys()) if (!after.files.has(path)) changes.push({ path, change: "deleted" })
  return changes.sort((a, b) => a.path.localeCompare(b.path))
}

interface RunSpec {
  id: string
  kind: RunKind
  name?: string
  expect: "pass" | "fail"
  /** Undefined for the nop agent, which does nothing. */
  steps?: FlowNode[]
  unavailable?: "no-solution-steps"
}

function outcomeFor(spec: RunSpec, reward: number | undefined, failedAt: string | undefined): Outcome {
  if (spec.unavailable) return "unknown"
  if (failedAt) return "error"
  if (reward === undefined) return "unknown"
  if (spec.kind === "nop") return reward === 0 ? "as-expected" : "unexpected"
  return (reward === 1) === (spec.expect === "pass") ? "as-expected" : "unexpected"
}

export function simulateTask(project: TaskProject): TaskSimulation {
  const initial = initialFilesystem(project)
  const checksFlow = flowOf(active(project.blocks.verifier, CHECKS))
  const stepsFlow = flowOf(active(project.blocks.solution, STEPS))
  const checks = checksFlow?.nodes ?? []
  const rewardMode = checksFlow?.reward ?? "all"
  if (!checksFlow) return { supported: false, checks, rewardMode, initial, runs: [] }

  const specs: RunSpec[] = [
    stepsFlow
      ? { id: "oracle", kind: "oracle", expect: "pass", steps: stepsFlow.nodes }
      : { id: "oracle", kind: "oracle", expect: "pass", unavailable: "no-solution-steps" },
    { id: "nop", kind: "nop", expect: "fail" },
    ...(project.scenarios ?? []).map((s): RunSpec => ({
      id: s.id,
      kind: "scenario",
      name: s.name,
      expect: s.expect,
      steps: s.steps,
    })),
  ]

  const runs = specs.map((spec): SimRun => {
    if (spec.unavailable) {
      return {
        id: spec.id,
        kind: spec.kind,
        expect: spec.expect,
        steps: [],
        checks: checks.map((c) => ({ id: c.id, status: "unknown" as const })),
        unavailable: spec.unavailable,
        outcome: "unknown",
        changes: [],
      }
    }
    const start = cloneVFS(initial)
    const ran = spec.steps ? runSteps(spec.steps, start) : undefined
    const vfs = ran?.vfs ?? start
    const evaluated = runChecks(checks, vfs, ran?.fsKnown ?? true, rewardMode)
    const failedAt = ran?.failedAt
    // A script that stopped with an error never reaches the verifier, so there is no reward to report.
    const reward = failedAt ? undefined : evaluated.reward
    return {
      id: spec.id,
      kind: spec.kind,
      name: spec.name,
      expect: spec.expect,
      steps: ran?.results ?? [],
      checks: evaluated.results,
      reward,
      failedAt,
      outcome: outcomeFor(spec, reward, failedAt),
      changes: diff(initial, vfs),
    }
  })

  return { supported: true, checks, rewardMode, initial, runs }
}

/** The runs a good task gets right: how many did what they should, out of those that could be decided. */
export function simulationSummary(sim: TaskSimulation): { good: number; bad: number; unknown: number } {
  let good = 0
  let bad = 0
  let unknown = 0
  for (const run of sim.runs) {
    if (run.outcome === "as-expected") good++
    else if (run.outcome === "unknown") unknown++
    else bad++
  }
  return { good, bad, unknown }
}
