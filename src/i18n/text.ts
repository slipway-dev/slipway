import type { TrajectoryProblem } from "@/features/runs/atif"
import type { PartManifest, ParamSpec } from "@/features/parts/types"
import { BUILTIN_PARTS } from "@/features/parts/registry"
import type { Issue } from "@/features/task/issues"
import { groupSkipped } from "@/lib/local-files"
import type { Skipped } from "@/lib/safe-files"

import type { Messages } from "./messages"

type Params = Record<string, string | number>

const builtin = new Map(BUILTIN_PARTS.map((part) => [part.id, part]))

/** Built-in part name in the UI language; anything else keeps the name it came with. */
function partName(t: Messages, id: unknown, fallback: unknown): string | number {
  const part = typeof id === "string" ? builtin.get(id) : undefined
  return part ? partText(t, part).name : (fallback as string | number) ?? ""
}

/** An issue's message in the UI language, with part and parameter names translated too. */
export function issueText(t: Messages, issue: Issue): string {
  const p: Params = { ...issue.params }
  if (issue.params) {
    if ("part" in p) p.part = partName(t, p.partId, p.part)
    if ("holder" in p) p.holder = partName(t, p.holderId, p.holder)
    if ("param" in p && typeof p.partId === "string" && typeof p.paramKey === "string") {
      p.param = t.parts[p.partId]?.params?.[p.paramKey]?.label ?? p.param
    }
    if (issue.code === "schema" && typeof p.keyword === "string") {
      p.detail = t.schemaKeywords[p.keyword] ?? p.detail
    }
    if (issue.code === "flow-incomplete") {
      const field = typeof p.field === "string" ? (t.flow.fields[p.field] ?? p.field) : ""
      const problem = t.flow.problems[p.problem as keyof typeof t.flow.problems]
      p.detail = problem ? problem(field) : String(p.problem)
    }
  }
  return t.issues[issue.code](p)
}

export function trajectoryProblemText(t: Messages, problem: TrajectoryProblem): string {
  const p = problem.params ?? {}
  const text = t.trajectoryProblems[problem.code](p)
  return p.subagent !== undefined ? t.trajectoryProblems.inSubagent(String(p.subagent), text) : text
}

/** One-line summary of files an import left out, or undefined when none were. */
export function skippedText(t: Messages, skipped: Skipped[]): string | undefined {
  if (skipped.length === 0) return undefined
  const parts = groupSkipped(skipped).map((g) => t.skipped[g.code](g.count, g.params ?? {}))
  return t.skipped.summary(skipped.length, parts.join(t.skipped.join))
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
