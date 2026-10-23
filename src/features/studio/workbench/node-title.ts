import { kindDef, nodeLabel, type FlowKind, type FlowNode } from "@/features/flow/types"
import type { Messages } from "@/i18n/messages"

/** The one value that says what a node is about: its path, or the first line of its command. */
export function primaryValue(node: FlowNode): string {
  const pick = (key: string) => (typeof node[key] === "string" ? (node[key] as string) : "")
  return pick("path") || pick("command").split("\n")[0]
}

/**
 * A node's name in the UI language: the author's own name for it if there
 * is one, else "File exists · /app/hello.txt" in the current language.
 */
export function nodeTitle(t: Messages, flow: FlowKind, node: FlowNode): string {
  const own = typeof node.label === "string" ? node.label.trim() : ""
  if (own) return own
  const kind = t.flow.kinds[node.kind as keyof typeof t.flow.kinds]
  if (!kind || !kindDef(flow, node.kind)) return nodeLabel(node)
  const value = primaryValue(node)
  return value ? `${kind.name} · ${value}` : kind.name
}
