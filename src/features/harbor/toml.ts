import { parse, stringify } from "smol-toml"

import { CONFIG_KEY_ORDER, type TaskConfig } from "./task-config"

/** Drop undefined values and empty tables so the output stays readable. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prune)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined || child === null) continue
      const pruned = prune(child)
      if (
        pruned &&
        typeof pruned === "object" &&
        !Array.isArray(pruned) &&
        Object.keys(pruned).length === 0
      ) {
        continue
      }
      out[key] = pruned
    }
    return out
  }
  return value
}

/**
 * Harbor reads timeouts as floats; write whole numbers as `900.0` like
 * `harbor task init` does so a round trip through Harbor stays diff-free.
 */
function floatTimeouts(toml: string): string {
  return toml.replace(/^([ \t]*[a-z_]*timeout_sec[ \t]*=[ \t]*)(\d+)[ \t]*$/gm, "$1$2.0")
}

export function stringifyTaskConfig(config: TaskConfig): string {
  const pruned = prune(config) as Record<string, unknown>
  const ordered: Record<string, unknown> = {}
  for (const key of CONFIG_KEY_ORDER) {
    if (key in pruned) ordered[key] = pruned[key]
  }
  for (const [key, value] of Object.entries(pruned)) {
    if (!(key in ordered)) ordered[key] = value
  }
  return floatTimeouts(stringify(ordered)) + "\n"
}

export function parseTaskConfig(text: string): TaskConfig {
  return parse(text) as TaskConfig
}
