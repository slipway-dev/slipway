import { isFlowValue, isComplete, type FlowNode } from "@/features/flow/types"
import { normalizePath } from "@/features/flow/vfs"

import type { TaskProject } from "./model"

/**
 * Suggestions for the instruction, drawn from the rest of the task. An agent
 * only knows what the instruction says, so a path the verifier looks at but
 * the instruction never names is a task the agent can fail by guessing.
 */

export const HINT_CODES = ["path-not-mentioned"] as const
export type HintCode = (typeof HINT_CODES)[number]

export interface Hint {
  code: HintCode
  severity: "warning" | "info"
  params: Record<string, string>
}

/** Paths the checks look at, once each, in order. */
export function checkedPaths(project: TaskProject): string[] {
  const paths: string[] = []
  for (const block of project.blocks.verifier) {
    const flow = block.params.flow
    if (block.disabled || block.partId !== "slipway/checks" || !isFlowValue(flow)) continue
    for (const node of flow.nodes as FlowNode[]) {
      if (!isComplete("checks", node) || typeof node.path !== "string") continue
      const path = normalizePath(node.path)
      if (path && !paths.includes(path)) paths.push(path)
    }
  }
  return paths
}

export function instructionHints(project: TaskProject): Hint[] {
  const text = project.instruction
  if (!text.trim()) return []
  return checkedPaths(project)
    .filter((path) => !text.includes(path))
    .map((path) => ({ code: "path-not-mentioned", severity: "warning", params: { path } }))
}
