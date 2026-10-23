import type { Content, ObservationResult, Step, ToolCall, Trajectory } from "./types"

export interface ParsedTrajectory {
  trajectory?: Trajectory
  error?: string
  /** Departures from ATIF that do not stop Slipway from showing the trajectory. */
  warnings: string[]
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
    return { error: `Not valid JSON: ${(error as Error).message}`, warnings: [] }
  }
  const t = value as Partial<Trajectory>
  if (!t || typeof t !== "object" || !Array.isArray(t.steps) || typeof t.agent !== "object" || !t.agent) {
    return { error: "Not an ATIF trajectory: it needs an agent object and a steps array.", warnings: [] }
  }
  return { trajectory: t as Trajectory, warnings: checkTrajectory(t as Trajectory, "") }
}

function checkTrajectory(t: Trajectory, where: string): string[] {
  const warnings: string[] = []
  const at = where ? `${where}: ` : ""
  if (t.schema_version && !KNOWN_VERSIONS.test(t.schema_version)) {
    warnings.push(`${at}schema_version ${t.schema_version} is newer than Slipway knows (ATIF-v1.8).`)
  }
  t.steps.forEach((step, i) => {
    if (step.step_id !== i + 1) {
      warnings.push(`${at}step ${i + 1} has step_id ${step.step_id}; ATIF requires 1, 2, 3, ...`)
    }
    const ids = new Set((step.tool_calls ?? []).map((c) => c.tool_call_id))
    for (const result of step.observation?.results ?? []) {
      if (result.source_call_id && !ids.has(result.source_call_id)) {
        warnings.push(`${at}step ${step.step_id} has a result for unknown tool call ${result.source_call_id}.`)
      }
    }
  })
  for (const sub of t.subagent_trajectories ?? []) {
    warnings.push(...checkTrajectory(sub, `subagent ${sub.trajectory_id ?? sub.agent?.name}`))
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
