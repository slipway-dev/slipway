import { describe, expect, it } from "vitest"

import { makeNode, newNodeId } from "@/features/flow/types"
import { environmentFile } from "@/features/parts/builtin/environment"
import { scriptVerifier } from "@/features/parts/builtin/verifier"
import { shellSolution } from "@/features/parts/builtin/solution"
import { createBlock, createLookup } from "@/features/parts/registry"

import type { Scenario, TaskProject } from "../model"
import { initialFilesystem, simulateTask, simulationSummary } from "../simulate"
import { createStarter } from "../starters"

type Flow = { nodes: unknown[]; reward?: string }
const checksOf = (p: TaskProject) => p.blocks.verifier[0].params.flow as Flow
const stepsOf = (p: TaskProject) => p.blocks.solution[0].params.flow as Flow

const scenario = (name: string, expect: "pass" | "fail", steps: Scenario["steps"]): Scenario => ({
  id: newNodeId(),
  name,
  expect,
  steps,
})

const run = (sim: ReturnType<typeof simulateTask>, id: string) => sim.runs.find((r) => r.id === id)!

describe("simulateTask on the Hello, world starter", () => {
  it("shows oracle passing and nop failing, as a good task does", () => {
    const sim = simulateTask(createStarter("hello-world"))
    expect(sim.supported).toBe(true)
    expect(run(sim, "oracle")).toMatchObject({ reward: 1, outcome: "as-expected", changes: [{ path: "/app/hello.txt", change: "created" }] })
    expect(run(sim, "nop")).toMatchObject({ reward: 0, outcome: "as-expected", changes: [] })
    expect(run(sim, "oracle").checks.map((c) => c.status)).toEqual(["pass"])
    expect(run(sim, "nop").checks.map((c) => [c.status, c.reason])).toEqual([["fail", "no such file"]])
    expect(simulationSummary(sim)).toEqual({ good: 2, bad: 0, unknown: 0 })
  })

  it("runs what-if scenarios against the verifier", () => {
    const project = createStarter("hello-world")
    project.scenarios = [
      scenario("Wrong greeting", "fail", [makeNode("steps", "write-file", { path: "/app/hello.txt", content: "Hello!" })]),
      scenario("Trailing newline is fine", "pass", [makeNode("steps", "write-file", { path: "/app/hello.txt", content: "Hello, world!\n\n" })]),
      scenario("Wrong place", "pass", [makeNode("steps", "write-file", { path: "/tmp/hello.txt", content: "Hello, world!" })]),
    ]
    const sim = simulateTask(project)
    const [wrong, fine, place] = project.scenarios.map((s) => run(sim, s.id))
    expect([wrong.outcome, fine.outcome, place.outcome]).toEqual(["as-expected", "as-expected", "unexpected"])
    expect([wrong.reward, fine.reward, place.reward]).toEqual([0, 1, 0])
    expect(place.name).toBe("Wrong place")
  })

  it("tells a leaking check from a good one: it passes when the agent does nothing", () => {
    const project = createStarter("hello-world")
    checksOf(project).nodes.push(makeNode("checks", "file-absent", { path: "/app/never-made" }))
    const sim = simulateTask(project)
    expect(run(sim, "nop").checks.map((c) => c.status)).toEqual(["fail", "pass"])
    expect(run(sim, "nop")).toMatchObject({ reward: 0, outcome: "as-expected" })
    checksOf(project).nodes.length = 0
    checksOf(project).nodes.push(makeNode("checks", "file-absent", { path: "/app/never-made" }))
    expect(run(simulateTask(project), "nop")).toMatchObject({ reward: 1, outcome: "unexpected" })
  })

  it("scores partial credit in weighted mode and still expects nop at 0", () => {
    const project = createStarter("hello-world")
    checksOf(project).reward = "weighted"
    checksOf(project).nodes.push(makeNode("checks", "dir-exists", { path: "/app" }))
    const sim = simulateTask(project)
    expect(run(sim, "oracle").reward).toBe(1)
    expect(run(sim, "nop")).toMatchObject({ reward: 0.5, outcome: "unexpected" })
  })
})

describe("what Slipway will not guess", () => {
  it("does not simulate a verifier that is a script", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier = [createBlock(scriptVerifier)]
    expect(simulateTask(project)).toMatchObject({ supported: false, unsupported: "other-verifier", runs: [] })
  })

  it("tells a verifier not chosen yet from one Slipway cannot run", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier = []
    expect(simulateTask(project)).toMatchObject({ supported: false, unsupported: "no-verifier" })
    // Variables for the verifier do not decide anything, so they do not count as a way of deciding.
    project.blocks.verifier = [createBlock(createLookup()("slipway/verifier-env")!)]
    expect(simulateTask(project, createLookup())).toMatchObject({ unsupported: "no-verifier" })
    expect(simulateTask(createStarter("hello-world")).unsupported).toBeUndefined()
  })

  it("still runs nop and scenarios when the solution is a script", () => {
    const project = createStarter("hello-world")
    project.blocks.solution = [createBlock(shellSolution)]
    const sim = simulateTask(project)
    expect(run(sim, "oracle")).toMatchObject({ unavailable: "no-solution-steps", outcome: "unknown" })
    expect(run(sim, "oracle").reward).toBeUndefined()
    expect(run(sim, "nop").outcome).toBe("as-expected")
    expect(simulationSummary(sim)).toEqual({ good: 1, bad: 0, unknown: 1 })
  })

  it("calls the reward unknown once a command ran", () => {
    const project = createStarter("hello-world")
    stepsOf(project).nodes.push(makeNode("steps", "run-command", { command: "make" }))
    const oracle = run(simulateTask(project), "oracle")
    expect(oracle.reward).toBeUndefined()
    expect(oracle.outcome).toBe("unknown")
    expect(oracle.steps.map((s) => s.status)).toEqual(["ok", "unknown"])
    expect(oracle.checks.map((c) => c.status)).toEqual(["unknown"])
  })

  it("keeps a command check unknown but a file check decided", () => {
    const project = createStarter("hello-world")
    checksOf(project).nodes.push(makeNode("checks", "command-succeeds", { command: "test -f /app/hello.txt" }))
    const oracle = run(simulateTask(project), "oracle")
    expect(oracle.checks.map((c) => c.status)).toEqual(["pass", "unknown"])
    expect(oracle.reward).toBeUndefined()
  })

  it("reports a step that would stop the script, with no reward", () => {
    const project = createStarter("hello-world")
    stepsOf(project).nodes.unshift(makeNode("steps", "make-dir", { path: "/app/hello.txt/inside" }))
    stepsOf(project).nodes.unshift(makeNode("steps", "write-file", { path: "/app/hello.txt/inside", content: "x" }))
    const oracle = run(simulateTask(project), "oracle")
    expect(oracle).toMatchObject({ outcome: "error", reward: undefined })
    expect(oracle.steps.map((s) => s.status)).toEqual(["ok", "error", "skipped"])
    expect(oracle.steps[1].message).toBe("File exists")
  })
})

describe("initialFilesystem", () => {
  const withFile = (path: string, destination: string, content = "data") => {
    const project = createStarter("hello-world")
    project.blocks.environment.push(createBlock(environmentFile, { path, destination, content }))
    return initialFilesystem(project)
  }

  it("starts in the working directory the image sets", () => {
    const vfs = initialFilesystem(createStarter("hello-world"))
    expect([...vfs.dirs].sort()).toEqual(["/", "/app"])
    expect(vfs.files.size).toBe(0)
  })

  it("places files the way COPY does", () => {
    expect([...withFile("data/in.txt", "/app/").files]).toEqual([["/app/in.txt", "data"]])
    expect([...withFile("data/in.txt", "/srv/renamed.txt").files]).toEqual([["/srv/renamed.txt", "data"]])
    expect([...withFile("data/in.txt", "inputs/").files]).toEqual([["/app/inputs/in.txt", "data"]])
    expect([...withFile("in.txt", "/a/b/c/").files.keys()]).toEqual(["/a/b/c/in.txt"])
  })

  it("lets a check see a declared data file, and a nop agent see it too", () => {
    const project = createStarter("hello-world")
    project.blocks.environment.push(createBlock(environmentFile, { path: "in.txt", destination: "/app/", content: "seed" }))
    checksOf(project).nodes.push(makeNode("checks", "file-equals", { path: "/app/in.txt", expected: "seed" }))
    const sim = simulateTask(project)
    expect(run(sim, "nop").checks.map((c) => c.status)).toEqual(["fail", "pass"])
    expect(run(sim, "oracle").reward).toBe(1)
  })

  it("ignores parts that are off or unfinished", () => {
    const project = createStarter("hello-world")
    const off = createBlock(environmentFile, { path: "a.txt", destination: "/app/" })
    off.disabled = true
    project.blocks.environment.push(off, createBlock(environmentFile, { path: "", destination: "/app/" }))
    expect(initialFilesystem(project).files.size).toBe(0)
  })
})
