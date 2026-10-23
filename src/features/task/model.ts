import type { TaskConfig } from "@/features/harbor/task-config"
import type { Block, SlotId } from "@/features/parts/types"

/** A file the author wrote or edited by hand. It wins over generated content. */
export interface FileOverride {
  content: string
  executable?: boolean
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
