import { Box, FileText, KeyRound, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react"

import type { SlotId } from "@/features/parts/types"

export type Selection =
  | { kind: "instruction" }
  | { kind: "slot"; slot: SlotId }
  | { kind: "settings" }
  | { kind: "file"; path: string }

export interface SectionMeta {
  label: string
  /** The Harbor file or folder the section produces. */
  target: string
  icon: LucideIcon
  hint: string
}

/** Fixed icons per Harbor file kind, used in nav, file tree and block headers. */
export const SECTIONS: Record<"instruction" | SlotId | "settings", SectionMeta> = {
  instruction: {
    label: "Instruction",
    target: "instruction.md",
    icon: FileText,
    hint: "What the agent is asked to do.",
  },
  environment: {
    label: "Environment",
    target: "environment/",
    icon: Box,
    hint: "The container the agent works in. Parts stack into environment/Dockerfile and [environment].",
  },
  verifier: {
    label: "Verifier",
    target: "tests/",
    icon: ShieldCheck,
    hint: "Runs after the agent and writes a reward to /logs/verifier/reward.txt.",
  },
  solution: {
    label: "Solution",
    target: "solution/",
    icon: KeyRound,
    hint: "Run by the oracle agent to show the task can be solved.",
  },
  settings: {
    label: "Task settings",
    target: "task.toml",
    icon: SlidersHorizontal,
    hint: "Name, metadata and timeouts.",
  },
}

export function iconForPath(path: string): LucideIcon {
  if (path === "instruction.md") return SECTIONS.instruction.icon
  if (path === "task.toml") return SECTIONS.settings.icon
  if (path.startsWith("environment/")) return SECTIONS.environment.icon
  if (path.startsWith("tests/")) return SECTIONS.verifier.icon
  if (path.startsWith("solution/")) return SECTIONS.solution.icon
  return FileText
}
