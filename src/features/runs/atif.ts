import type { Content, ObservationResult, Step, ToolCall, Trajectory } from "./types"

/** Problems reading a trajectory; the UI translates by code. */
export const TRAJECTORY_PROBLEM_CODES = [
  "invalid-json", // { detail }
  "not-atif",
  "unknown-version", // { version, subagent? }
  "step-id", // { index, stepId, subagent? }
  "unknown-call", // { stepId, callId, subagent? }
] as const

export type TrajectoryProblemCode = (typeof TRAJECTORY_PROBLEM_CODES)[number]

export interface TrajectoryProblem {
  code: TrajectoryProblemCode
  /** English text, used when no translation exists. */
  message: string
  /** `subagent` is set when the problem is inside an embedded subagent. */
  params?: Record<string, string | number>
}

export interface ParsedTrajectory {
  trajectory?: Trajectory
  /** Set when nothing can be shown. */
  error?: TrajectoryProblem
  /** Departures from ATIF that do not stop Slipway from showing the trajectory. */
  warnings: TrajectoryProblem[]
}

const KNOWN_VERSIONS = /^ATIF-v1\.[0-8]$/

/**
 * Parse an ATIF trajectory leniently: show whatever is readable and report
 * what Harbor's own validators would reject (step ids, call references).
 */
export function parseTrajectory(text: string): ParsedTrajectory {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    const detail = (error as Error).message
    return { error: { code: "invalid-json", message: `Not valid JSON: ${detail}`, params: { detail } }, warnings: [] }
  }
  const t = value as Partial<Trajectory>
  if (!t || typeof t !== "object" || !Array.isArray(t.steps) || typeof t.agent !== "object" || !t.agent) {
    return {
      error: { code: "not-atif", message: "Not an ATIF trajectory: it needs an agent object and a steps array." },
      warnings: [],
    }
  }
  return { trajectory: t as Trajectory, warnings: checkTrajectory(t as Trajectory) }
}

function checkTrajectory(t: Trajectory, subagent?: string): TrajectoryProblem[] {
  const warnings: TrajectoryProblem[] = []
  const at = subagent ? `subagent ${subagent}: ` : ""
  const where: Record<string, string> = subagent ? { subagent } : {}
  if (t.schema_version && !KNOWN_VERSIONS.test(t.schema_version)) {
    warnings.push({
      code: "unknown-version",
      message: `${at}schema_version ${t.schema_version} is newer than Slipway knows (ATIF-v1.8).`,
      params: { version: t.schema_version, ...where },
    })
  }
  t.steps.forEach((step, i) => {
    if (step.step_id !== i + 1) {
      warnings.push({
        code: "step-id",
        message: `${at}step ${i + 1} has step_id ${step.step_id}; ATIF requires 1, 2, 3, ...`,
        params: { index: i + 1, stepId: step.step_id, ...where },
      })
    }
    const ids = new Set((step.tool_calls ?? []).map((c) => c.tool_call_id))
    for (const result of step.observation?.results ?? []) {
      if (result.source_call_id && !ids.has(result.source_call_id)) {
        warnings.push({
          code: "unknown-call",
          message: `${at}step ${step.step_id} has a result for unknown tool call ${result.source_call_id}.`,
          params: { stepId: step.step_id, callId: result.source_call_id, ...where },
        })
      }
    }
  })
  for (const sub of t.subagent_trajectories ?? []) {
    warnings.push(...checkTrajectory(sub, sub.trajectory_id ?? sub.agent?.name))
  }
  return warnings
}

export interface ToolCallPair {
  call: ToolCall
  results: ObservationResult[]
}

/**
 * Pair each tool call with its results. Results without a source_call_id
 * (terminus-2 batches several commands into one terminal output) are
 * returned separately rather than guessed at.
 */
export function pairToolCalls(step: Step): { pairs: ToolCallPair[]; unpaired: ObservationResult[] } {
  const results = step.observation?.results ?? []
  const pairs = (step.tool_calls ?? []).map((call) => ({
    call,
    results: results.filter((r) => r.source_call_id === call.tool_call_id),
  }))
  const known = new Set(pairs.map((p) => p.call.tool_call_id))
  return { pairs, unpaired: results.filter((r) => !r.source_call_id || !known.has(r.source_call_id)) }
}

export function contentText(content: Content | null | undefined): string {
  if (content == null) return ""
  if (typeof content === "string") return content
  return content
    .map((part) => (part.type === "text" ? (part.text ?? "") : `[${part.type}: ${part.source?.path ?? ""}]`))
    .join("\n")
}

/** Resolve a subagent reference against embedded trajectories (ATIF v1.7+). */
export function findSubagent(root: Trajectory, trajectoryId: string): Trajectory | undefined {
  for (const sub of root.subagent_trajectories ?? []) {
    if (sub.trajectory_id === trajectoryId) return sub
    const nested = findSubagent(sub, trajectoryId)
    if (nested) return nested
  }
  return undefined
}

export interface TrajectoryTotals {
  steps: number
  toolCalls: number
  promptTokens: number
  completionTokens: number
  costUsd?: number
  durationSec?: number
}

/** Prefer final_metrics; fall back to summing per-step metrics. */
export function totals(t: Trajectory): TrajectoryTotals {
  const sum = (pick: (s: Step) => number | null | undefined) =>
    t.steps.reduce((acc, s) => acc + (pick(s) ?? 0), 0)
  const stepCost = sum((s) => s.metrics?.cost_usd)
  const times = t.steps.map((s) => (s.timestamp ? Date.parse(s.timestamp) : NaN)).filter(Number.isFinite)
  return {
    steps: t.steps.length,
    toolCalls: sum((s) => s.tool_calls?.length),
    promptTokens: t.final_metrics?.total_prompt_tokens ?? sum((s) => s.metrics?.prompt_tokens),
    completionTokens: t.final_metrics?.total_completion_tokens ?? sum((s) => s.metrics?.completion_tokens),
    costUsd: t.final_metrics?.total_cost_usd ?? (stepCost || undefined),
    durationSec: times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 1000 : undefined,
  }
}
