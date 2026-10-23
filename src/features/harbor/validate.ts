import Ajv, { type ErrorObject } from "ajv"

import taskSchema from "./task-schema.json"
import type { TaskConfig } from "./task-config"

export interface SchemaError {
  /** Dotted path into task.toml, e.g. "environment.cpus". */
  path: string
  message: string
}

const ajv = new Ajv({ allErrors: true, strict: false })
const validateFn = ajv.compile(taskSchema)

function toPath(error: ErrorObject): string {
  const parts = error.instancePath.split("/").filter(Boolean)
  if (error.keyword === "required") {
    parts.push(String(error.params.missingProperty))
  }
  return parts.join(".") || "(root)"
}

/**
 * Validate a task config against Harbor's own JSON Schema. Pydantic encodes
 * optional fields as `anyOf: [T, null]`, so one bad value yields an error per
 * branch; keep the most specific one per path.
 */
export function validateTaskConfig(config: TaskConfig): SchemaError[] {
  if (validateFn(config)) return []
  const byPath = new Map<string, SchemaError>()
  for (const error of validateFn.errors ?? []) {
    if (error.keyword === "anyOf") continue
    const path = toPath(error)
    if (!byPath.has(path)) {
      byPath.set(path, { path, message: error.message ?? "is invalid" })
    }
  }
  return [...byPath.values()]
}
