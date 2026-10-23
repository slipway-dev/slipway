import { describe, expect, it } from "vitest"

import { makeNode } from "@/features/flow/types"

import { checkedPaths, instructionHints } from "../hints"
import { createStarter } from "../starters"

describe("instructionHints", () => {
  it("accepts an instruction that names the path the verifier checks", () => {
    const project = createStarter("hello-world")
    expect(checkedPaths(project)).toEqual(["/app/hello.txt"])
    expect(instructionHints(project)).toEqual([])
  })

  it("warns about a checked path the instruction never names", () => {
    const project = createStarter("hello-world")
    project.instruction = "Write a friendly greeting to a file."
    expect(instructionHints(project)).toEqual([
      { code: "path-not-mentioned", severity: "warning", params: { path: "/app/hello.txt" } },
    ])
  })

  it("stays quiet until there is an instruction, and ignores unfinished or repeated checks", () => {
    const project = createStarter("hello-world")
    project.instruction = ""
    expect(instructionHints(project)).toEqual([])
    project.instruction = "Do it."
    const flow = project.blocks.verifier[0].params.flow as { nodes: unknown[] }
    flow.nodes.push(
      makeNode("checks", "file-exists", { path: "/app/hello.txt" }),
      makeNode("checks", "file-exists", { path: "relative" }),
      makeNode("checks", "command-succeeds", { command: "true" }),
    )
    expect(instructionHints(project).map((h) => h.params.path)).toEqual(["/app/hello.txt"])
  })
})
