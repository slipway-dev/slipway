import { normalizePath } from "./vfs"

/**
 * Flows: the verifier as a list of checks, the solution as a list of steps.
 *
 * A flow is plain JSON. It compiles to a bash script Harbor runs (compile.ts)
 * and runs in a virtual filesystem so Slipway can show what it would do
 * without Docker (simulate.ts). Both read the same node definitions here, so
 * adding a kind means describing it once and implementing it in both places;
 * the differential tests in __tests__ hold the two to the same behaviour.
 */

export type FieldType =
  /** An absolute path in the container. */
  | "path"
  /** One line of text. */
  | "line"
  /** Several lines of text. */
  | "text"
  /** A bash command or script. */
  | "command"
  | "boolean"

export interface FieldDef {
  key: string
  type: FieldType
  required?: boolean
  default?: string | boolean
}

export interface KindDef {
  kind: string
  fields: FieldDef[]
  /** False when only a shell can say what the node does (run a command). */
  simulable: boolean
}

/** A node on a flow: `kind` says what it is, the other keys are its fields. */
export interface FlowNode {
  id: string
  kind: string
  /** Names the node in output; defaults to a description of what it does. */
  label?: string
  /** Checks only: how much the check counts in a weighted score. A whole number, 1 or more. */
  weight?: number
  [field: string]: string | number | boolean | undefined
}

export type RewardMode = "all" | "weighted"

export interface FlowValue {
  nodes: FlowNode[]
  /** Checks only: all checks must pass for reward 1, or the weighted share that passed. */
  reward?: RewardMode
}

export function isFlowValue(value: unknown): value is FlowValue {
  return typeof value === "object" && value !== null && Array.isArray((value as FlowValue).nodes)
}

const path = (key = "path"): FieldDef => ({ key, type: "path", required: true, default: "/app/" })

export const CHECK_KINDS = [
  { kind: "file-exists", fields: [path()], simulable: true },
  { kind: "dir-exists", fields: [path()], simulable: true },
  { kind: "file-absent", fields: [path()], simulable: true },
  {
    kind: "file-equals",
    fields: [
      path(),
      { key: "expected", type: "text", required: true, default: "" },
      { key: "trim", type: "boolean", default: true },
    ],
    simulable: true,
  },
  {
    kind: "file-contains",
    fields: [path(), { key: "text", type: "line", required: true, default: "" }],
    simulable: true,
  },
  {
    kind: "command-succeeds",
    fields: [{ key: "command", type: "command", required: true, default: "" }],
    simulable: false,
  },
  {
    kind: "command-output",
    fields: [
      { key: "command", type: "command", required: true, default: "" },
      { key: "expected", type: "text", required: true, default: "" },
      { key: "trim", type: "boolean", default: true },
    ],
    simulable: false,
  },
] as const satisfies readonly KindDef[]

export const STEP_KINDS = [
  {
    kind: "write-file",
    fields: [path(), { key: "content", type: "text", default: "" }],
    simulable: true,
  },
  {
    kind: "append-file",
    fields: [path(), { key: "content", type: "text", default: "" }],
    simulable: true,
  },
  { kind: "make-dir", fields: [{ ...path(), default: "/app/" }], simulable: true },
  { kind: "delete", fields: [path()], simulable: true },
  {
    kind: "run-command",
    fields: [{ key: "command", type: "command", required: true, default: "" }],
    simulable: false,
  },
] as const satisfies readonly KindDef[]

export type CheckKind = (typeof CHECK_KINDS)[number]["kind"]
export type StepKind = (typeof STEP_KINDS)[number]["kind"]
export type FlowKind = "checks" | "steps"

export const KINDS: Record<FlowKind, readonly KindDef[]> = { checks: CHECK_KINDS, steps: STEP_KINDS }

export function kindDef(flow: FlowKind, kind: string): KindDef | undefined {
  return KINDS[flow].find((k) => k.kind === kind)
}

export function newNodeId(): string {
  return crypto.randomUUID().slice(0, 8)
}

/** A node of `kind` with its fields at their defaults. */
export function createNode(flow: FlowKind, kind: string): FlowNode {
  const def = kindDef(flow, kind)
  if (!def) throw new Error(`Unknown ${flow} kind: ${kind}`)
  const node: FlowNode = { id: newNodeId(), kind }
  for (const field of def.fields) {
    if (field.default !== undefined) node[field.key] = field.default
  }
  return node
}

export type NodeProblem = "unknown-kind" | "required" | "not-absolute" | "root" | "multiline"

export interface NodeIssue {
  /** The field with the problem; undefined for a problem with the node itself. */
  field?: string
  problem: NodeProblem
}

function str(node: FlowNode, key: string): string {
  const value = node[key]
  return typeof value === "string" ? value : ""
}

/**
 * What stops a node from doing anything meaningful. An incomplete node is
 * treated as failing everywhere (compile and simulate alike), so a half
 * filled check can never turn into a pass.
 */
export function nodeIssues(flow: FlowKind, node: FlowNode): NodeIssue[] {
  const def = kindDef(flow, node.kind)
  if (!def) return [{ problem: "unknown-kind" }]
  const issues: NodeIssue[] = []
  for (const field of def.fields) {
    const value = str(node, field.key)
    if (field.required && value.trim() === "") {
      issues.push({ field: field.key, problem: "required" })
      continue
    }
    if (field.type === "path" && value !== "") {
      if (!value.startsWith("/") || value.includes("\0")) issues.push({ field: field.key, problem: "not-absolute" })
      else if (node.kind === "delete" && normalizePath(value) === "/") issues.push({ field: field.key, problem: "root" })
    }
    if (field.type === "line" && /[\r\n]/.test(value)) issues.push({ field: field.key, problem: "multiline" })
  }
  return issues
}

export function isComplete(flow: FlowKind, node: FlowNode): boolean {
  return nodeIssues(flow, node).length === 0
}

/** English description, used in generated scripts and as a fallback label. */
export function describeNode(node: FlowNode): string {
  const p = str(node, "path")
  const command = str(node, "command").split("\n")[0]
  switch (node.kind) {
    case "file-exists":
      return `file exists: ${p}`
    case "dir-exists":
      return `directory exists: ${p}`
    case "file-absent":
      return `nothing at: ${p}`
    case "file-equals":
      return `file equals expected text: ${p}`
    case "file-contains":
      return `file contains "${str(node, "text")}": ${p}`
    case "command-succeeds":
      return `command succeeds: ${command}`
    case "command-output":
      return `command output matches: ${command}`
    case "write-file":
      return `write ${p}`
    case "append-file":
      return `append to ${p}`
    case "make-dir":
      return `make directory ${p}`
    case "delete":
      return `delete ${p}`
    case "run-command":
      return `run: ${command}`
    default:
      return node.kind
  }
}

export function nodeLabel(node: FlowNode): string {
  const label = typeof node.label === "string" ? node.label.trim() : ""
  return (label || describeNode(node)).replace(/[\r\n]+/g, " ")
}

/** Weights are whole numbers of at least 1 so the script can add them in bash. */
export function nodeWeight(node: FlowNode): number {
  const w = typeof node.weight === "number" ? Math.floor(node.weight) : 1
  return Number.isFinite(w) && w >= 1 ? w : 1
}
