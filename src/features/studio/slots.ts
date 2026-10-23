import { Box, FileText, KeyRound, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react"

import type { SlotId } from "@/features/parts/types"
import type { Messages } from "@/i18n/messages"

export type Selection =
  | { kind: "instruction" }
  | { kind: "slot"; slot: SlotId }
  | { kind: "settings" }
  | { kind: "file"; path: string }

export type SectionKey = "instruction" | SlotId | "settings"

export interface SectionMeta {
  /** The Harbor file or folder the section produces. */
  target: string
  icon: LucideIcon
}

/** Fixed icons per Harbor file kind, used in the tree, block headers and file views. */
export const SECTIONS: Record<SectionKey, SectionMeta> = {
  instruction: { target: "instruction.md", icon: FileText },
  environment: { target: "environment/", icon: Box },
  verifier: { target: "tests/", icon: ShieldCheck },
  solution: { target: "solution/", icon: KeyRound },
  settings: { target: "task.toml", icon: SlidersHorizontal },
}

/** A section's label and one-line hint in the UI language. */
export function sectionText(t: Messages, key: SectionKey): { label: string; hint: string } {
  return t.studio.sections[key]
}

/** The slot whose folder holds `path`, if any. */
export function slotForPath(path: string): SlotId | undefined {
  if (path.startsWith("environment/")) return "environment"
  if (path.startsWith("tests/")) return "verifier"
  if (path.startsWith("solution/")) return "solution"
  return undefined
}

export function iconForPath(path: string): LucideIcon {
  if (path === "instruction.md") return SECTIONS.instruction.icon
  if (path === "task.toml") return SECTIONS.settings.icon
  const slot = slotForPath(path)
  return slot ? SECTIONS[slot].icon : FileText
}

export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === "slot" && b.kind === "slot") return a.slot === b.slot
  if (a.kind === "file" && b.kind === "file") return a.path === b.path
  return true
}
