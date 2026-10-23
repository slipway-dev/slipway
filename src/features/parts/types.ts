import type { FlowKind, FlowValue } from "@/features/flow/types"

/**
 * A part is a reusable piece of a Harbor task: a base image, a set of apt
 * packages, a pytest verifier, a solve script. Parts are plain JSON so that
 * built-in, third-party and user-made parts share one format and can later be
 * shared through Slipway Yard without code execution.
 *
 * A block is one part placed on a task, with its parameter values.
 */

/** Where on the task a part goes. Instruction and task settings are edited directly. */
export type SlotId = "environment" | "verifier" | "solution"

export const SLOT_IDS: readonly SlotId[] = ["environment", "verifier", "solution"]

/**
 * Dockerfile sections, written in this order. Each environment part adds
 * lines to one section, so blocks can be reordered within a section but a
 * COPY can never land before FROM.
 */
export const DOCKERFILE_SECTIONS = [
  "base",
  "system",
  "runtime",
  "files",
  "setup",
] as const
export type DockerfileSection = (typeof DOCKERFILE_SECTIONS)[number]

export type ParamType =
  | "string"
  | "text"
  | "code"
  | "number"
  | "boolean"
  | "enum"
  | "list"
  | "map"
  /** An ordered list of checks or steps; see features/flow. */
  | "flow"

export type ParamValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string>
  | FlowValue

export interface ParamSpec {
  key: string
  label: string
  type: ParamType
  description?: string
  default?: ParamValue
  required?: boolean
  placeholder?: string
  /** Allowed values for "enum". */
  options?: string[]
  /** Suggested values for "string". */
  suggestions?: string[]
  /** Editor language for "code": "bash", "python", "markdown", "json", ... */
  language?: string
  /** For "flow": whether the list holds verifier checks or solution steps. */
  flow?: FlowKind
}

export interface FileContribution {
  /** Path relative to the task root; may use template syntax. */
  path: string
  template: string
  executable?: boolean
}

export interface DockerfileContribution {
  section: DockerfileSection
  template: string
}

export interface PartContributions {
  dockerfile?: DockerfileContribution[]
  files?: FileContribution[]
  /**
   * Deep-merged into task.toml. A string leaf that is exactly "{{param}}"
   * takes the param's typed value (and is dropped when the value is empty);
   * other strings are rendered as templates. Arrays from several blocks
   * are concatenated.
   */
  config?: Record<string, unknown>
}

export interface PartManifest {
  /** Namespaced id, e.g. "slipway/apt-packages". */
  id: string
  version: string
  name: string
  summary: string
  slot: SlotId
  /**
   * Parts sharing a role are mutually exclusive on one task: one base image,
   * one verifier runner, one solver.
   */
  role?: string
  params: ParamSpec[]
  contributes: PartContributions
  author?: string
  /** Where a third-party part came from (URL or registry ref). */
  source?: string
}

export interface Block {
  id: string
  partId: string
  params: Record<string, ParamValue>
  disabled?: boolean
}
