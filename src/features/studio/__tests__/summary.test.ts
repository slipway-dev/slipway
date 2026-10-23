import { describe, expect, it } from "vitest"

import { shellSolution } from "@/features/parts/builtin/solution"
import { scriptVerifier } from "@/features/parts/builtin/verifier"
import { createBlock, createLookup } from "@/features/parts/registry"
import { composeTask } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import { lintTask } from "@/features/task/lint"
import { createStarter } from "@/features/task/starters"

import { issuePart, issuesForPart, summarizePart } from "../blueprint/summary"

const issue = (partial: Partial<Issue>): Issue => ({ severity: "error", code: "schema", message: "", ...partial })

describe("issuePart", () => {
  const project = createStarter("hello-world")

  it("places issues by block, by file and by the rule that has no file", () => {
    expect(issuePart(issue({ blockId: project.blocks.solution[0].id }), project)).toBe("solution")
    expect(issuePart(issue({ blockId: project.blocks.verifier[0].id }), project)).toBe("verifier")
    expect(issuePart(issue({ path: "instruction.md" }), project)).toBe("instruction")
    expect(issuePart(issue({ path: "task.toml" }), project)).toBe("settings")
    expect(issuePart(issue({ path: "environment/Dockerfile" }), project)).toBe("environment")
    expect(issuePart(issue({ path: "tests/test.sh" }), project)).toBe("verifier")
    expect(issuePart(issue({ code: "no-solution" }), project)).toBe("solution")
    expect(issuePart(issue({ code: "no-environment" }), project)).toBe("environment")
    expect(issuePart(issue({ code: "no-verifier" }), project)).toBe("verifier")
    expect(issuePart(issue({ path: "elsewhere/x" }), project)).toBeUndefined()
  })

  it("gives every lint issue of a blank task a home", () => {
    const blank = createStarter("blank")
    const issues = lintTask(blank, composeTask(blank, createLookup()))
    expect(issues.length).toBeGreaterThan(0)
    for (const i of issues) expect(issuePart(i, blank), i.code).toBeDefined()
    expect(issuesForPart(issues, blank, "instruction").map((i) => i.code)).toEqual(["empty-instruction"])
  })
})

describe("summarizePart", () => {
  it("describes the Hello, world starter", () => {
    const project = createStarter("hello-world")
    expect(summarizePart(project, "instruction")).toEqual({
      kind: "instruction",
      firstLine: "Create a file at `/app/hello.txt` that contains exactly `Hello, world!`.",
    })
    expect(summarizePart(project, "environment")).toEqual({ kind: "environment", image: "ubuntu:24.04", parts: 1 })
    expect(summarizePart(project, "verifier")).toEqual({ kind: "checks", count: 1, mode: "all" })
    expect(summarizePart(project, "solution")).toEqual({ kind: "steps", count: 1 })
    expect(summarizePart(project, "settings")).toEqual({ kind: "settings", name: "my-org/hello-world" })
  })

  it("names another kind of verifier or solution, and says when there is none", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier = [createBlock(scriptVerifier)]
    project.blocks.solution = [createBlock(shellSolution)]
    expect(summarizePart(project, "verifier")).toEqual({ kind: "part", partId: "slipway/script-verifier", slot: "verifier" })
    expect(summarizePart(project, "solution")).toEqual({ kind: "part", partId: "slipway/shell-solution", slot: "solution" })
    project.blocks.verifier = []
    expect(summarizePart(project, "verifier")).toEqual({ kind: "none", slot: "verifier" })
  })

  it("skips parts that are turned off", () => {
    const project = createStarter("hello-world")
    project.blocks.environment[0].disabled = true
    expect(summarizePart(project, "environment")).toEqual({ kind: "environment", image: undefined, parts: 0 })
  })
})
