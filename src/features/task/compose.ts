import { TASK_PATHS, TASK_SCHEMA_VERSION } from "@/features/harbor/constants"
import type { TaskConfig } from "@/features/harbor/task-config"
import { stringifyTaskConfig } from "@/features/harbor/toml"
import { defaultParams, type PartLookup } from "@/features/parts/registry"
import { isTruthy, renderTemplate, wholeVariable, type TemplateScope } from "@/features/parts/template"
import { DOCKERFILE_SECTIONS, SLOT_IDS, type DockerfileSection } from "@/features/parts/types"

import type { Issue } from "./issues"
import type { TaskProject } from "./model"

export type FileOrigin =
  | { kind: "generated"; by: "config" | "instruction" | "dockerfile" }
  | { kind: "part"; blockId: string; partId: string }
  | { kind: "override" }

export interface TaskFile {
  path: string
  /** Text, or base64 when `encoding` is "base64". */
  content: string
  encoding?: "base64"
  executable: boolean
  origin: FileOrigin
  /** Set when a hand edit replaced content Slipway would otherwise generate. */
  replaces?: FileOrigin
}

export interface ComposedTask {
  files: TaskFile[]
  config: TaskConfig
  issues: Issue[]
}

/** Files only Slipway writes; overrides for them are ignored. */
export const MANAGED_PATHS: readonly string[] = [TASK_PATHS.config, TASK_PATHS.instruction]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Objects merge, arrays concatenate, scalars replace. */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const existing = out[key]
    if (isObject(existing) && isObject(value)) out[key] = deepMerge(existing, value)
    else if (Array.isArray(existing) && Array.isArray(value)) out[key] = [...existing, ...value]
    else out[key] = structuredClone(value)
  }
  return out as T
}

function renderConfig(value: unknown, scope: TemplateScope): unknown {
  if (typeof value === "string") {
    const name = wholeVariable(value)
    if (name !== undefined) {
      const v = scope[name]
      return isTruthy(v) || typeof v === "boolean" ? structuredClone(v) : undefined
    }
    return renderTemplate(value, scope)
  }
  if (Array.isArray(value)) return value.map((item) => renderConfig(item, scope))
  if (isObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      const rendered = renderConfig(child, scope)
      if (rendered !== undefined && rendered !== "") out[key] = rendered
    }
    return out
  }
  return value
}

function normalizePath(path: string): string {
  return path.trim().replace(/\/+/g, "/").replace(/^\.\//, "")
}

function unsafePath(path: string): boolean {
  return !path || path.startsWith("/") || path.split("/").includes("..") || path.endsWith("/")
}

const PATH_ORDER = [TASK_PATHS.config, TASK_PATHS.instruction, "environment/", "tests/", "solution/"]

function pathRank(path: string): number {
  const i = PATH_ORDER.findIndex((p) => (p.endsWith("/") ? path.startsWith(p) : path === p))
  return i === -1 ? PATH_ORDER.length : i
}

export function sortPaths(a: string, b: string): number {
  return pathRank(a) - pathRank(b) || a.localeCompare(b)
}

/**
 * Turn a project into the files of a Harbor task directory. Pure: the same
 * project and parts always produce the same files.
 */
export function composeTask(project: TaskProject, lookup: PartLookup): ComposedTask {
  const issues: Issue[] = []
  const files = new Map<string, TaskFile>()
  const sections = Object.fromEntries(
    DOCKERFILE_SECTIONS.map((s) => [s, [] as string[]]),
  ) as Record<DockerfileSection, string[]>
  let config: TaskConfig = deepMerge({}, project.config)

  for (const slot of SLOT_IDS) {
    const roles = new Map<string, { name: string; id: string }>()
    for (const block of project.blocks[slot] ?? []) {
      if (block.disabled) continue
      const part = lookup(block.partId)
      if (!part) {
        issues.push({
          severity: "error",
          code: "unknown-part",
          message: `Part ${block.partId} is not installed.`,
          params: { partId: block.partId },
          blockId: block.id,
        })
        continue
      }
      if (part.role) {
        const holder = roles.get(part.role)
        if (holder) {
          issues.push({
            severity: "error",
            code: "role-conflict",
            message: `Only one ${part.role} part can be used; ${holder.name} is already on this task.`,
            params: { role: part.role, part: part.name, partId: part.id, holder: holder.name, holderId: holder.id },
            blockId: block.id,
          })
          continue
        }
        roles.set(part.role, { name: part.name, id: part.id })
      }

      const scope: TemplateScope = { ...defaultParams(part), ...block.params }
      for (const spec of part.params) {
        const value = scope[spec.key]
        const missing =
          spec.type === "number" ? value === undefined || value === "" : !isTruthy(value)
        if (spec.required && spec.type !== "boolean" && missing) {
          issues.push({
            severity: "error",
            code: "missing-param",
            message: `${part.name}: ${spec.label} is required.`,
            params: { part: part.name, partId: part.id, param: spec.label, paramKey: spec.key },
            blockId: block.id,
          })
        }
      }

      try {
        for (const d of part.contributes.dockerfile ?? []) {
          sections[d.section].push(renderTemplate(d.template, scope))
        }
        for (const f of part.contributes.files ?? []) {
          const path = normalizePath(renderTemplate(f.path, scope))
          if (unsafePath(path) || MANAGED_PATHS.includes(path) || path === TASK_PATHS.dockerfile) {
            issues.push({
              severity: "error",
              code: "bad-path",
              message: `${part.name} tried to write "${path}", which is not allowed.`,
              params: { part: part.name, partId: part.id, path },
              blockId: block.id,
            })
            continue
          }
          if (files.has(path)) {
            issues.push({
              severity: "error",
              code: "file-conflict",
              message: `${part.name} and another part both write ${path}.`,
              params: { part: part.name, partId: part.id, path },
              path,
              blockId: block.id,
            })
          }
          files.set(path, {
            path,
            content: renderTemplate(f.template, scope),
            executable: Boolean(f.executable),
            origin: { kind: "part", blockId: block.id, partId: part.id },
          })
        }
        if (part.contributes.config) {
          const rendered = renderConfig(part.contributes.config, scope) as Record<string, unknown>
          config = deepMerge(config, rendered)
        }
      } catch (error) {
        issues.push({
          severity: "error",
          code: "template-error",
          message: `${part.name}: ${(error as Error).message}`,
          params: { part: part.name, partId: part.id, detail: (error as Error).message },
          blockId: block.id,
        })
      }
    }
  }

  const dockerfile = DOCKERFILE_SECTIONS.map((s) =>
    sections[s].map((fragment) => fragment.trim()).filter(Boolean).join("\n"),
  )
    .filter(Boolean)
    .join("\n\n")
  if (dockerfile) {
    files.set(TASK_PATHS.dockerfile, {
      path: TASK_PATHS.dockerfile,
      content: dockerfile + "\n",
      executable: false,
      origin: { kind: "generated", by: "dockerfile" },
    })
  }

  config = { ...config, schema_version: TASK_SCHEMA_VERSION }
  files.set(TASK_PATHS.config, {
    path: TASK_PATHS.config,
    content: stringifyTaskConfig(config),
    executable: false,
    origin: { kind: "generated", by: "config" },
  })
  const instruction = project.instruction.trimEnd()
  files.set(TASK_PATHS.instruction, {
    path: TASK_PATHS.instruction,
    content: instruction ? instruction + "\n" : "",
    executable: false,
    origin: { kind: "generated", by: "instruction" },
  })

  for (const [rawPath, override] of Object.entries(project.overrides)) {
    const path = normalizePath(rawPath)
    if (MANAGED_PATHS.includes(path) || unsafePath(path)) continue
    const existing = files.get(path)
    files.set(path, {
      path,
      content: override.content,
      encoding: override.encoding,
      executable: override.executable ?? existing?.executable ?? path.endsWith(".sh"),
      origin: { kind: "override" },
      replaces: existing?.origin,
    })
  }

  return {
    files: [...files.values()].sort((a, b) => sortPaths(a.path, b.path)),
    config,
    issues,
  }
}
