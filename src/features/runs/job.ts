import { readJson, readText, type FileSet } from "./files"
import type { JobResult, TimingInfo, TrialResult } from "./types"

export type TrialStatus = "pass" | "partial" | "fail" | "error" | "unscored"

export interface TrialSummary {
  name: string
  result?: TrialResult
  taskName?: string
  agent: string
  model?: string
  rewards: Record<string, number>
  /** The reward the status is based on: "reward" if present, else the mean. */
  reward?: number
  status: TrialStatus
  durationSec?: number
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
  /** Multi-step trials keep each step's logs under steps/<name>/. */
  stepNames: string[]
}

export interface JobIndex {
  result?: JobResult
  trials: TrialSummary[]
}

export function seconds(timing?: TimingInfo | null): number | undefined {
  if (!timing?.started_at || !timing.finished_at) return undefined
  const ms = Date.parse(timing.finished_at) - Date.parse(timing.started_at)
  return Number.isFinite(ms) ? ms / 1000 : undefined
}

function primaryReward(rewards: Record<string, number>): number | undefined {
  if (typeof rewards.reward === "number") return rewards.reward
  const values = Object.values(rewards).filter((v) => typeof v === "number")
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
}

export function statusFor(result: TrialResult | undefined, reward: number | undefined): TrialStatus {
  if (result?.exception_info) return "error"
  if (reward === undefined) return "unscored"
  if (reward >= 1) return "pass"
  if (reward > 0) return "partial"
  return "fail"
}

/** Rewards from result.json, falling back to the verifier's files for unfinished trials. */
async function readRewards(files: FileSet, trial: string, result?: TrialResult): Promise<Record<string, number>> {
  const fromResult = result?.verifier_result?.rewards
  if (fromResult) return fromResult
  const json = await readJson<Record<string, number>>(files, `${trial}/verifier/reward.json`)
  if (json && typeof json === "object") return json
  const text = await readText(files, `${trial}/verifier/reward.txt`)
  const value = text === undefined ? NaN : Number.parseFloat(text)
  return Number.isFinite(value) ? { reward: value } : {}
}

export function trialNames(files: FileSet): string[] {
  const names = new Set<string>()
  for (const path of files.keys()) {
    const [top, file] = path.split("/")
    if (file === "result.json" || file === "config.json") names.add(top)
    if (path.split("/")[1] === "agent") names.add(top)
  }
  return [...names].sort()
}

export function stepNamesOf(files: FileSet, trial: string): string[] {
  const names = new Set<string>()
  const prefix = `${trial}/steps/`
  for (const path of files.keys()) {
    if (path.startsWith(prefix)) names.add(path.slice(prefix.length).split("/")[0])
  }
  return [...names].sort()
}

export async function summarizeTrial(files: FileSet, name: string): Promise<TrialSummary> {
  const result = await readJson<TrialResult>(files, `${name}/result.json`)
  // A trial still running has config.json but no result.json yet.
  const config = result?.config ?? (await readJson<TrialResult["config"]>(files, `${name}/config.json`))
  const rewards = await readRewards(files, name, result)
  const reward = primaryReward(rewards)
  const modelInfo = result?.agent_info?.model_info
  return {
    name,
    result,
    taskName: result?.task_name,
    agent: result?.agent_info?.name ?? config?.agent?.name ?? "unknown agent",
    model:
      config?.agent?.model_name ??
      (modelInfo?.name ? [modelInfo.provider, modelInfo.name].filter(Boolean).join("/") : undefined),
    rewards,
    reward,
    status: statusFor(result, reward),
    durationSec: seconds(result),
    costUsd: result?.agent_result?.cost_usd ?? undefined,
    inputTokens: result?.agent_result?.n_input_tokens ?? undefined,
    outputTokens: result?.agent_result?.n_output_tokens ?? undefined,
    stepNames: stepNamesOf(files, name),
  }
}

export async function indexJob(files: FileSet): Promise<JobIndex> {
  const result = await readJson<JobResult>(files, "result.json")
  const trials = await Promise.all(trialNames(files).map((name) => summarizeTrial(files, name)))
  return { result, trials }
}

/** Where a trial's trajectory lives, per harbor.viewer: <trial>[/steps/<step>]/agent/trajectory.json */
export function trajectoryPath(trial: string, step?: string): string {
  return step ? `${trial}/steps/${step}/agent/trajectory.json` : `${trial}/agent/trajectory.json`
}

export function trialRoot(trial: string, step?: string): string {
  return step ? `${trial}/steps/${step}` : trial
}
