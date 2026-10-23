import { describe, expect, it } from "vitest"

import { createStarter } from "@/features/task/starters"

import { countWords, taskFacts } from "../blueprint/facts"

describe("countWords", () => {
  it("counts spaced words and each CJK character", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("Write hello to /app/hello.txt")).toBe(4)
    expect(countWords("写入 hello 文件")).toBe(5)
  })
})

describe("taskFacts", () => {
  it("reads what each part of a starter holds", () => {
    const facts = taskFacts(createStarter("hello-world"))
    expect(facts.instruction.lines).toBeGreaterThan(0)
    expect(facts.instruction.firstLine).not.toBe("")
    expect(facts.environment.image).toBe("ubuntu:24.04")
    expect(facts.verifier.runner).toBe("slipway/checks")
    expect(facts.verifier.checks).toHaveLength(1)
    expect(facts.solution.runner).toBe("slipway/solution-steps")
    expect(facts.solution.steps).toHaveLength(1)
    expect(facts.settings.name).toBe("my-org/hello-world")
  })

  it("leaves a blank task empty rather than guessing", () => {
    const facts = taskFacts(createStarter("blank"))
    expect(facts.environment.packages).toEqual([])
    expect(facts.verifier.checks).toEqual([])
    expect(facts.solution.steps).toEqual([])
  })
})
