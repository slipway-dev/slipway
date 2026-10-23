import { checkTemplate } from "./template"
import {
  DOCKERFILE_SECTIONS,
  SLOT_IDS,
  type ParamType,
  type PartManifest,
} from "./types"

const PARAM_TYPES: readonly ParamType[] = [
  "string",
  "text",
  "code",
  "number",
  "boolean",
  "enum",
  "list",
  "map",
]

/** Files Slipway writes itself; parts may not replace them. */
const RESERVED_PATHS = ["task.toml", "instruction.md", "environment/Dockerfile"]

const ID = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Static check of a file path template: relative, no .., not reserved. */
function checkPath(path: string): string | undefined {
  if (path.startsWith("/")) return "must be relative to the task root"
  if (path.split("/").includes("..")) return "must not contain .."
  if (RESERVED_PATHS.includes(path)) return `${path} is written by Slipway`
  return undefined
}

function checkConfigTemplates(value: unknown, at: string, errors: string[]) {
  if (typeof value === "string") {
    try {
      checkTemplate(value)
    } catch (e) {
      errors.push(`${at}: ${(e as Error).message}`)
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => checkConfigTemplates(item, `${at}[${i}]`, errors))
  } else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      checkConfigTemplates(v, `${at}.${k}`, errors)
    }
  }
}

/**
 * Validate an untrusted part manifest (user-made or downloaded). Returns a
 * list of problems; empty means the manifest is safe to load.
 */
export function validateManifest(input: unknown): string[] {
  const errors: string[] = []
  if (!isObject(input)) return ["Manifest must be a JSON object"]
  const m = input as Partial<PartManifest>

  if (typeof m.id !== "string" || !ID.test(m.id)) {
    errors.push('id must look like "namespace/part-name" (lowercase, digits, -)')
  }
  for (const field of ["version", "name", "summary"] as const) {
    if (typeof m[field] !== "string" || !m[field]) errors.push(`${field} is required`)
  }
  if (!SLOT_IDS.includes(m.slot as never)) {
    errors.push(`slot must be one of ${SLOT_IDS.join(", ")}`)
  }
  if (m.role !== undefined && typeof m.role !== "string") errors.push("role must be a string")

  if (!Array.isArray(m.params)) {
    errors.push("params must be an array")
  } else {
    const seen = new Set<string>()
    m.params.forEach((p, i) => {
      if (!isObject(p)) return errors.push(`params[${i}] must be an object`)
      if (typeof p.key !== "string" || !KEY.test(p.key)) {
        errors.push(`params[${i}].key must be an identifier`)
      } else if (seen.has(p.key)) {
        errors.push(`params[${i}].key "${p.key}" is duplicated`)
      } else seen.add(p.key)
      if (typeof p.label !== "string") errors.push(`params[${i}].label is required`)
      if (!PARAM_TYPES.includes(p.type as ParamType)) {
        errors.push(`params[${i}].type must be one of ${PARAM_TYPES.join(", ")}`)
      }
      if (p.type === "enum" && (!Array.isArray(p.options) || p.options.length === 0)) {
        errors.push(`params[${i}].options is required for enum`)
      }
    })
  }

  const c = m.contributes
  if (!isObject(c)) {
    errors.push("contributes must be an object")
    return errors
  }
  if (c.dockerfile !== undefined) {
    if (!Array.isArray(c.dockerfile)) errors.push("contributes.dockerfile must be an array")
    else {
      if (m.slot !== "environment" && c.dockerfile.length > 0) {
        errors.push("only environment parts may contribute to the Dockerfile")
      }
      c.dockerfile.forEach((d, i) => {
        if (!DOCKERFILE_SECTIONS.includes(d?.section)) {
          errors.push(
            `contributes.dockerfile[${i}].section must be one of ${DOCKERFILE_SECTIONS.join(", ")}`,
          )
        }
        try {
          checkTemplate(String(d?.template ?? ""))
        } catch (e) {
          errors.push(`contributes.dockerfile[${i}].template: ${(e as Error).message}`)
        }
      })
    }
  }
  if (c.files !== undefined) {
    if (!Array.isArray(c.files)) errors.push("contributes.files must be an array")
    else
      c.files.forEach((f, i) => {
        if (typeof f?.path !== "string" || !f.path) {
          return errors.push(`contributes.files[${i}].path is required`)
        }
        const problem = checkPath(f.path)
        if (problem) errors.push(`contributes.files[${i}].path ${problem}`)
        for (const field of ["path", "template"] as const) {
          try {
            checkTemplate(String(f[field] ?? ""))
          } catch (e) {
            errors.push(`contributes.files[${i}].${field}: ${(e as Error).message}`)
          }
        }
      })
  }
  if (c.config !== undefined) {
    if (!isObject(c.config)) errors.push("contributes.config must be an object")
    else checkConfigTemplates(c.config, "contributes.config", errors)
  }
  return errors
}
