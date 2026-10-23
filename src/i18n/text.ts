import type { PartManifest, ParamSpec } from "@/features/parts/types"
import type { Issue } from "@/features/task/issues"

import type { Messages } from "./messages"

/** An issue's message in the UI language; rules without a translation keep their own text. */
export function issueText(t: Messages, issue: Issue): string {
  return t.issues[issue.code] ?? issue.message
}

/** A part's display name and summary in the UI language. */
export function partText(t: Messages, part: PartManifest): { name: string; summary: string } {
  const tr = t.parts[part.id]
  return { name: tr?.name ?? part.name, summary: tr?.summary ?? part.summary }
}

export function paramText(
  t: Messages,
  partId: string | undefined,
  spec: ParamSpec,
): { label: string; description?: string } {
  const tr = partId ? t.parts[partId]?.params?.[spec.key] : undefined
  return { label: tr?.label ?? spec.label, description: tr?.description ?? spec.description }
}
