import type { FlowNode } from "@/features/flow/types"
import type { TaskConfig } from "@/features/harbor/task-config"
import type { Block, SlotId } from "@/features/parts/types"

/** A file the author wrote, edited by hand or imported. It wins over generated content. */
export interface FileOverride {
  /** Text, or base64 when `encoding` is "base64" (imported binary files). */
  content: string
  encoding?: "base64"
  executable?: boolean
}

/**
 * A "what if" for the simulator: steps an agent might take, and whether the
 * verifier should then pass. A good verifier fails the lazy and wrong ones.
 */
export interface Scenario {
  id: string
  name: string
  /** Steps like a solution's, run on the starting filesystem. */
  steps: FlowNode[]
  expect: "pass" | "fail"
}

/**
 * Slipway's editable form of a Harbor task. It is plain JSON so it can live
 * in IndexedDB now and sync to a server later without a migration of shape.
 * The Harbor task directory is derived from it by compose().
 */
export interface TaskProject {
  formatVersion: 1
  id: string
  createdAt: string
  updatedAt: string
  instruction: string
  /** Hand-edited task.toml values: [task], [metadata], timeouts. */
  config: TaskConfig
  blocks: Record<SlotId, Block[]>
  /** Keyed by path relative to the task root. */
  overrides: Record<string, FileOverride>
  /** Absent in projects saved before scenarios existed. */
  scenarios?: Scenario[]
  /** How the author runs the task: not part of the task, remembered for the run command. */
  run?: RunChoice
}

/** The agent, model and options for `harbor run`; see features/harbor/agents. */
export interface RunChoice {
  agent: string
  model?: string
  attempts?: number
  forceBuild?: boolean
}

/** "org/name" → "name", used for the Launch folder and run commands. */
export function taskDirName(project: TaskProject): string {
  const full = project.config.task?.name?.trim() || "untitled-task"
  const short = full.split("/").pop() || full
  return short.replace(/[^A-Za-z0-9._-]+/g, "-") || "untitled-task"
}

export function taskTitle(project: TaskProject): string {
  return project.config.task?.name?.trim() || "Untitled task"
}
