import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { compileChecks, compileSteps } from "../compile"
import { runChecks, runSteps } from "../simulate"
import { nodeIssues, type FlowNode, type RewardMode } from "../types"
import { createVFS, normalizePath, type VFS } from "../vfs"

/**
 * The simulator and the compiled bash must agree. These tests build random
 * flows, run the real script with real bash in a sandbox directory, run the
 * same flow in the simulator, and compare what each did.
 *
 * Every path is built under a fresh sandbox, and a flow is skipped unless
 * every path in it resolves inside that sandbox: these scripts run
 * `rm -rf`, so a path that could climb out must never reach bash.
 */

let sandbox: string
let rewards: string

beforeAll(() => {
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), "slipway-flow-")))
  rewards = realpathSync(mkdtempSync(join(tmpdir(), "slipway-reward-")))
})
afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true })
  rmSync(rewards, { recursive: true, force: true })
})

/** mulberry32: a small seeded generator, so a failure names a seed that replays it. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Rand = () => number
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]

const NAMES = ["a", "b", "c.txt", "d"] as const
const CONTENT = [
  "",
  "x",
  "x\n",
  "a\nb",
  "a\nb\n",
  "it's",
  'say "hi" $HOME `id` \\ done',
  "SLIPWAY_EOF",
  "line\nSLIPWAY_EOF\nmore",
  "  trailing  ",
  "line\r\n",
  "\n\n",
  "tab\tx\t",
  "end  \n  \n",
  "ünï©ode ✓",
] as const
const LINES = ["x", "a", "-x", "$HOME", "it's", "*", "[", "\\", "q", " ", "é", "X", "Ab"] as const

/** A path under the sandbox, 1–3 deep, sometimes sloppy (`..`, `//`, trailing slash) but never climbing out. */
function randomPath(r: Rand): string {
  const depth = 1 + Math.floor(r() * 3)
  let parts: string[] = Array.from({ length: depth }, () => pick(r, NAMES))
  const sloppy = r()
  // A name followed by `..` cancels itself, so the path still resolves inside the sandbox.
  if (sloppy < 0.1) parts = [pick(r, NAMES), "..", ...parts]
  let path = sandbox + "/" + parts.join("/")
  if (sloppy > 0.9) path = path.replace("/", "//")
  if (sloppy > 0.95) path += "/"
  return path
}

function contained(path: string): boolean {
  const n = normalizePath(path)
  return n !== undefined && n.startsWith(sandbox + "/")
}

function randomNode(r: Rand, kind: string): FlowNode {
  const node: FlowNode = { id: Math.random().toString(36).slice(2, 8), kind }
  switch (kind) {
    case "write-file":
    case "append-file":
      node.path = randomPath(r)
      node.content = pick(r, CONTENT)
      break
    case "make-dir":
    case "delete":
    case "file-exists":
    case "dir-exists":
    case "file-absent":
      node.path = randomPath(r)
      break
    case "file-equals":
      node.path = randomPath(r)
      node.expected = pick(r, CONTENT)
      node.trim = r() < 0.6
      break
    case "file-contains":
      node.path = randomPath(r)
      node.text = pick(r, LINES)
      break
  }
  node.weight = 1 + Math.floor(r() * 3)
  return node
}

const STEP_KINDS = ["write-file", "write-file", "append-file", "make-dir", "delete"] as const
const CHECK_KINDS = ["file-exists", "dir-exists", "file-absent", "file-equals", "file-equals", "file-contains"] as const

function randomInitialFS(r: Rand): VFS {
  const vfs = createVFS()
  for (const dir of normalizeChain(sandbox)) vfs.dirs.add(dir)
  const n = Math.floor(r() * 5)
  for (let i = 0; i < n; i++) {
    const path = normalizePath(randomPath(r))!
    const parent = path.slice(0, path.lastIndexOf("/"))
    // Plant only what is consistent: nothing below a file, no file where a directory is.
    if (!contained(path) || anyFileOnChain(vfs, parent) || vfs.dirs.has(path)) continue
    if (r() < 0.3) {
      if (vfs.files.has(path)) continue
      for (const dir of normalizeChain(path)) vfs.dirs.add(dir)
    } else {
      for (const dir of normalizeChain(parent)) vfs.dirs.add(dir)
      vfs.files.set(path, pick(r, CONTENT))
    }
  }
  return vfs
}

function normalizeChain(path: string): string[] {
  const out: string[] = []
  let current = ""
  for (const part of path.split("/").filter(Boolean)) {
    current += "/" + part
    out.push(current)
  }
  return out
}
const anyFileOnChain = (vfs: VFS, path: string) => normalizeChain(path).some((p) => vfs.files.has(p))

/** Reset the sandbox directory to the filesystem described by `vfs`. */
function realize(vfs: VFS) {
  rmSync(sandbox, { recursive: true, force: true })
  mkdirSync(sandbox, { recursive: true })
  for (const dir of [...vfs.dirs].sort()) if (dir.startsWith(sandbox + "/")) mkdirSync(dir, { recursive: true })
  for (const [path, content] of vfs.files) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

interface Tree {
  files: Record<string, string>
  dirs: string[]
}

function walk(dir: string, tree: Tree = { files: {}, dirs: [] }): Tree {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      tree.dirs.push(path)
      walk(path, tree)
    } else tree.files[path] = readFileSync(path, "utf8")
  }
  return tree
}

function simulated(vfs: VFS): Tree {
  const inside = (p: string) => p.startsWith(sandbox + "/")
  return {
    files: Object.fromEntries([...vfs.files].filter(([p]) => inside(p))),
    dirs: [...vfs.dirs].filter(inside),
  }
}

const sortTree = (t: Tree): Tree => ({ files: Object.fromEntries(Object.entries(t.files).sort()), dirs: [...t.dirs].sort() })

function bash(script: string) {
  const run = spawnSync("bash", ["-c", script], { cwd: sandbox, encoding: "utf8", timeout: 10_000 })
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

const FLOWS = 250

describe("steps: compiled bash and simulator agree", () => {
  it.each(Array.from({ length: FLOWS }, (_, i) => i + 1))("seed %i", (seed) => {
    const r = rng(seed)
    const initial = randomInitialFS(r)
    const nodes = Array.from({ length: 1 + Math.floor(r() * 6) }, () => randomNode(r, pick(r, STEP_KINDS)))
    if (!nodes.every((n) => contained(String(n.path)))) return
    expect(nodes.every((n) => nodeIssues("steps", n).length === 0)).toBe(true)

    const sim = runSteps(nodes, initial)
    realize(initial)
    const real = bash(compileSteps(nodes))

    expect(sortTree(walk(sandbox)), `seed ${seed}\n${compileSteps(nodes)}`).toEqual(sortTree(simulated(sim.vfs)))
    expect(real.status === 0, `exit ${real.status}: ${real.stderr}\nseed ${seed}`).toBe(sim.failedAt === undefined)
  })
})

describe("checks: compiled bash and simulator agree", () => {
  it.each(Array.from({ length: FLOWS }, (_, i) => i + 1))("seed %i", (seed) => {
    const r = rng(1000 + seed)
    const initial = randomInitialFS(r)
    const nodes = Array.from({ length: 1 + Math.floor(r() * 5) }, () => randomNode(r, pick(r, CHECK_KINDS)))
    if (!nodes.every((n) => contained(String(n.path)))) return
    const mode: RewardMode = r() < 0.5 ? "all" : "weighted"
    // Plant content that matches, or nearly matches, so checks pass as well as fail.
    for (const n of nodes) {
      const wants = n.kind === "file-equals" || n.kind === "file-contains"
      if (!wants || r() > 0.7) continue
      const p = normalizePath(String(n.path))!
      const parent = p.slice(0, p.lastIndexOf("/"))
      if (anyFileOnChain(initial, parent) || initial.dirs.has(p)) continue
      for (const dir of normalizeChain(parent)) initial.dirs.add(dir)
      if (n.kind === "file-equals") {
        initial.files.set(p, String(n.expected) + pick(r, ["", "  ", "\n", "\r\n\n"]))
      } else {
        const text = String(n.text)
        const variant = pick(r, [text, text, text.toUpperCase(), text.toLowerCase(), text.slice(0, -1)])
        initial.files.set(p, pick(r, CONTENT) + variant + pick(r, CONTENT))
      }
    }

    const sim = runChecks(nodes, initial, true, mode)
    realize(initial)
    const rewardPath = join(rewards, "reward.txt")
    rmSync(rewardPath, { force: true })
    const script = compileChecks(nodes, { mode, rewardPath })
    const real = bash(script)
    const label = `seed ${seed}\n${script}\n${real.stdout}`

    expect(real.status, label).toBe(0)
    const statuses = real.stdout
      .split("\n")
      .filter((l) => /^(pass|fail): /.test(l))
      .map((l) => l.slice(0, 4))
    expect(statuses, label).toEqual(sim.results.map((c) => c.status))
    expect(Number(readFileSync(rewardPath, "utf8")), label).toBe(sim.reward)
    expect(sortTree(walk(sandbox)), "checks must not change the filesystem").toEqual(sortTree(simulated(initial)))
  })
})

describe("behaviour that needs a real shell", () => {
  const check = (node: Partial<FlowNode> & { kind: string }, mode: RewardMode = "all") => {
    const rewardPath = join(rewards, "shell.txt")
    rmSync(rewardPath, { force: true })
    const script = compileChecks([{ id: "n", ...node }], { mode, rewardPath })
    const run = bash(script)
    expect(run.status, run.stderr).toBe(0)
    return { line: run.stdout.split("\n")[0].slice(0, 4), reward: Number(readFileSync(rewardPath, "utf8")) }
  }

  it("runs commands for command checks", () => {
    expect(check({ kind: "command-succeeds", command: "test 1 -eq 1" })).toEqual({ line: "pass", reward: 1 })
    expect(check({ kind: "command-succeeds", command: "exit 3" })).toEqual({ line: "fail", reward: 0 })
    expect(check({ kind: "command-output", command: "printf 'hi  \\n\\n'", expected: "hi", trim: true }).line).toBe("pass")
    expect(check({ kind: "command-output", command: "echo hi", expected: "hi", trim: false }).line).toBe("fail")
    expect(check({ kind: "command-output", command: "echo hi", expected: "hi\n", trim: false }).line).toBe("pass")
    expect(check({ kind: "command-output", command: "echo 'it'\"'\"'s'", expected: "it's", trim: true }).line).toBe("pass")
  })

  it("never turns an incomplete check into a pass", () => {
    expect(check({ kind: "file-exists", path: "" })).toEqual({ line: "fail", reward: 0 })
    expect(check({ kind: "command-succeeds", command: "" })).toEqual({ line: "fail", reward: 0 })
    expect(check({ kind: "file-contains", path: sandbox, text: "" })).toEqual({ line: "fail", reward: 0 })
  })

  it("scores a verifier with no checks as 0", () => {
    const rewardPath = join(rewards, "empty.txt")
    expect(bash(compileChecks([], { rewardPath })).status).toBe(0)
    expect(readFileSync(rewardPath, "utf8").trim()).toBe("0")
    expect(bash(compileChecks([], { mode: "weighted", rewardPath })).status).toBe(0)
    expect(readFileSync(rewardPath, "utf8").trim()).toBe("0")
  })

  it("truncates a weighted reward to four decimals", () => {
    const rewardPath = join(rewards, "weighted.txt")
    const nodes: FlowNode[] = [
      { id: "1", kind: "dir-exists", path: sandbox },
      { id: "2", kind: "dir-exists", path: sandbox + "/missing" },
      { id: "3", kind: "dir-exists", path: sandbox + "/missing" },
    ]
    expect(bash(compileChecks(nodes, { mode: "weighted", rewardPath })).status).toBe(0)
    expect(readFileSync(rewardPath, "utf8").trim()).toBe("0.3333")
  })

  it("stops a solution at the first failing command", () => {
    const nodes: FlowNode[] = [
      { id: "1", kind: "write-file", path: sandbox + "/one", content: "1" },
      { id: "2", kind: "run-command", command: "exit 7" },
      { id: "3", kind: "write-file", path: sandbox + "/three", content: "3" },
    ]
    realize(createVFS())
    expect(bash(compileSteps(nodes)).status).toBe(7)
    expect(Object.keys(walk(sandbox).files)).toEqual([sandbox + "/one"])
  })

  it("refuses to delete the root, however the path is spelled", () => {
    for (const path of ["/", "//", "/a/..", "/./"]) {
      expect(nodeIssues("steps", { id: "x", kind: "delete", path })).toEqual([{ field: "path", problem: "root" }])
    }
    const script = compileSteps([{ id: "x", kind: "delete", path: "/a/.." }])
    expect(script).not.toMatch(/rm -rf/)
    expect(script).toContain("exit 1")
  })
})
