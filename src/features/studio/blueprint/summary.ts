import { isFlowValue } from "@/features/flow/types"
import { SLOT_IDS, type SlotId } from "@/features/parts/types"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"

import { SECTIONS, type SectionKey } from "../slots"

/** The part of the task an issue is about, so each piece of the ship can show its own problems. */
export function issuePart(issue: Issue, project: TaskProject): SectionKey | undefined {
  if (issue.blockId) {
    return SLOT_IDS.find((slot) => project.blocks[slot].some((b) => b.id === issue.blockId))
  }
  const path = issue.path
  if (path === "instruction.md") return "instruction"
  if (path === "task.toml") return "settings"
  if (path) {
    const slot = SLOT_IDS.find((s) => path.startsWith(SECTIONS[s].target))
    if (slot) return slot
  }
  if (issue.code === "no-environment") return "environment"
  if (issue.code === "no-verifier") return "verifier"
  if (issue.code === "no-solution") return "solution"
  return undefined
}

export function issuesForPart(issues: Issue[], project: TaskProject, part: SectionKey): Issue[] {
  return issues.filter((issue) => issuePart(issue, project) === part)
}

/** What a part holds, in plain data; the UI words it in the current language. */
export type PartSummary =
  | { kind: "instruction"; firstLine: string }
  | { kind: "environment"; image?: string; parts: number }
  | { kind: "checks"; count: number; mode: "all" | "weighted" }
  | { kind: "steps"; count: number }
  | { kind: "part"; partId: string; slot: SlotId }
  | { kind: "none"; slot: SlotId }
  | { kind: "settings"; name: string }

function summarizeSlot(project: TaskProject, slot: "verifier" | "solution"): PartSummary {
  const runnerId = slot === "verifier" ? "slipway/checks" : "slipway/solution-steps"
  const blocks = project.blocks[slot].filter((b) => !b.disabled)
  const flowBlock = blocks.find((b) => b.partId === runnerId)
  if (flowBlock) {
    const flow = flowBlock.params.flow
    const count = isFlowValue(flow) ? flow.nodes.length : 0
    return slot === "verifier"
      ? { kind: "checks", count, mode: isFlowValue(flow) && flow.reward === "weighted" ? "weighted" : "all" }
      : { kind: "steps", count }
  }
  const first = blocks[0]
  return first ? { kind: "part", partId: first.partId, slot } : { kind: "none", slot }
}

export function summarizePart(project: TaskProject, part: SectionKey): PartSummary {
  switch (part) {
    case "instruction": {
      const firstLine = project.instruction.split("\n").find((l) => l.trim())?.trim() ?? ""
      return { kind: "instruction", firstLine }
    }
    case "environment": {
      const blocks = project.blocks.environment.filter((b) => !b.disabled)
      const base = blocks.find((b) => b.partId === "slipway/base-image")
      const image = typeof base?.params.image === "string" && base.params.image ? base.params.image : undefined
      return { kind: "environment", image, parts: blocks.length }
    }
    case "verifier":
    case "solution":
      return summarizeSlot(project, part)
    case "settings":
      return { kind: "settings", name: project.config.task?.name?.trim() ?? "" }
  }
}
