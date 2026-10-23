import {
  cloneVFS,
  isDir,
  isFile,
  mkdirP,
  normalizePath,
  removeAll,
  trimLines,
  writeFile,
  type VFS,
} from "./vfs"
import { isComplete, kindDef, nodeWeight, type FlowNode, type RewardMode } from "./types"

/**
 * Run a flow in a virtual filesystem. This is a model of the bash that
 * compile.ts emits, not a shell: it knows the file and directory kinds, and
 * says "unknown" for anything only a real shell could answer (running a
 * command). The differential tests hold it to the real thing.
 */

function str(node: FlowNode, key: string): string {
  const value = node[key]
  return typeof value === "string" ? value : ""
}

/* Steps */

export type StepStatus = "ok" | "error" | "unknown" | "skipped"

export interface StepResult {
  id: string
  status: StepStatus
  /** What went wrong for "error", or why it could not run for "unknown". */
  message?: string
}

export interface StepsRun {
  vfs: VFS
  results: StepResult[]
  /** False once a command ran whose effect Slipway cannot know. */
  fsKnown: boolean
  /** The id of the step where the script would stop with an error. */
  failedAt?: string
}

function applyStep(node: FlowNode, vfs: VFS): string | undefined {
  const path = normalizePath(str(node, "path"))!
  switch (node.kind) {
    case "write-file":
      return writeFile(vfs, path, str(node, "content"), false)
    case "append-file":
      return writeFile(vfs, path, str(node, "content"), true)
    case "make-dir":
      return mkdirP(vfs, path)
    case "delete":
      removeAll(vfs, path)
      return undefined
    default:
      return "unknown step"
  }
}

/** Carry out steps on a copy of `initial`, stopping where the script would (`set -e`). */
export function runSteps(nodes: FlowNode[], initial: VFS): StepsRun {
  const vfs = cloneVFS(initial)
  const results: StepResult[] = []
  let fsKnown = true
  let failedAt: string | undefined

  for (const node of nodes) {
    if (failedAt) {
      results.push({ id: node.id, status: "skipped" })
      continue
    }
    if (!isComplete("steps", node)) {
      failedAt = node.id
      results.push({ id: node.id, status: "error", message: "incomplete" })
      continue
    }
    if (kindDef("steps", node.kind)?.simulable === false) {
      fsKnown = false
      results.push({ id: node.id, status: "unknown", message: "runs a command" })
      continue
    }
    if (!fsKnown) {
      results.push({ id: node.id, status: "unknown", message: "after a command" })
      continue
    }
    const message = applyStep(node, vfs)
    if (message) {
      failedAt = node.id
      results.push({ id: node.id, status: "error", message })
    } else {
      results.push({ id: node.id, status: "ok" })
    }
  }
  return { vfs, results, fsKnown, failedAt }
}

/* Checks */

export type CheckStatus = "pass" | "fail" | "unknown"

export interface CheckResult {
  id: string
  status: CheckStatus
  /** Why a check failed or could not be decided, in English. */
  reason?: string
}

function evalCheck(node: FlowNode, vfs: VFS): CheckResult {
  const result = (status: CheckStatus, reason?: string): CheckResult => ({ id: node.id, status, reason })
  if (!isComplete("checks", node)) return result("fail", "incomplete")
  if (kindDef("checks", node.kind)?.simulable === false) return result("unknown", "runs a command")

  const path = normalizePath(str(node, "path"))!
  const trim = node.trim !== false
  switch (node.kind) {
    case "file-exists":
      return isFile(vfs, path) ? result("pass") : result("fail", "no such file")
    case "dir-exists":
      return isDir(vfs, path) ? result("pass") : result("fail", "no such directory")
    case "file-absent":
      return isFile(vfs, path) || isDir(vfs, path) ? result("fail", "it exists") : result("pass")
    case "file-equals": {
      if (!isFile(vfs, path)) return result("fail", "no such file")
      const actual = vfs.files.get(path)!
      const expected = str(node, "expected")
      const equal = trim ? trimLines(actual) === trimLines(expected) : actual === expected
      return equal ? result("pass") : result("fail", "content differs")
    }
    case "file-contains": {
      if (!isFile(vfs, path)) return result("fail", "no such file")
      return vfs.files.get(path)!.includes(str(node, "text")) ? result("pass") : result("fail", "text not found")
    }
    default:
      return result("fail", "unknown check")
  }
}

export interface ChecksRun {
  results: CheckResult[]
  /** Undefined while any check cannot be decided. */
  reward?: number
}

/** The reward the script would write; the same arithmetic as the bash, in whole numbers. */
export function rewardFor(
  nodes: FlowNode[],
  results: CheckResult[],
  mode: RewardMode,
): number | undefined {
  if (results.some((r) => r.status === "unknown")) return undefined
  let earned = 0
  let possible = 0
  nodes.forEach((node, i) => {
    const w = nodeWeight(node)
    possible += w
    if (results[i].status === "pass") earned += w
  })
  if (mode === "weighted") return possible > 0 ? Math.floor((earned * 10000) / possible) / 10000 : 0
  return possible > 0 && earned === possible ? 1 : 0
}

/** Evaluate checks against a filesystem; `fsKnown` false means every answer is unknown. */
export function runChecks(nodes: FlowNode[], vfs: VFS, fsKnown: boolean, mode: RewardMode = "all"): ChecksRun {
  const results = nodes.map((node) =>
    // An incomplete check fails whatever the filesystem holds, so it never waits on a command.
    fsKnown || !isComplete("checks", node)
      ? evalCheck(node, vfs)
      : ({ id: node.id, status: "unknown", reason: "after a command" } as CheckResult),
  )
  return { results, reward: rewardFor(nodes, results, mode) }
}
