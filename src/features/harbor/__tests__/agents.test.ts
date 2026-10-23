import { describe, expect, it } from "vitest"

import { AGENTS, DEFAULT_AGENT, agentInfo, requiredKeys, runCommand } from "../agents"

/** AgentName values in harbor 0.24.0 (harbor/models/agent/name.py). */
const HARBOR_AGENTS = new Set(["oracle", "nop", "acp", "claude-code", "cline-cli", "cortex-code", "terminus", "terminus-1", "terminus-2", "aider", "codex", "cursor-cli", "gemini-cli", "antigravity-cli", "rovodev-cli", "goose", "grok-build", "hermes", "junie", "mini-swe-agent", "nemo-agent", "swe-agent", "opencode", "openclaw", "openhands", "openhands-sdk", "antigravity-sdk", "kimi-code", "kimi-cli", "langgraph", "deerflow", "mimo", "mcode", "pi", "qwen-coder", "copilot-cli", "code-puppy", "devin", "trae-agent", "computer-1", "eve", "fx", "fx-dev", "dspy-rlm", "vibe", "muse-code", "strands"])

describe("AGENTS", () => {
  it("lists only names harbor run accepts, once each", () => {
    for (const a of AGENTS) expect(HARBOR_AGENTS.has(a.name), a.name).toBe(true)
    expect(new Set(AGENTS.map((a) => a.name)).size).toBe(AGENTS.length)
    expect(agentInfo(DEFAULT_AGENT)).toBeDefined()
  })

  it("includes the agents people ask for by name", () => {
    for (const name of ["pi", "opencode", "openhands", "claude-code", "codex", "terminus-2"]) {
      expect(agentInfo(name), name).toBeDefined()
    }
  })
})

describe("runCommand", () => {
  it("builds the harbor run line", () => {
    expect(runCommand({ dir: "hello", agent: "oracle", model: "x/y" })).toBe("harbor run -p ./hello -a oracle")
    expect(runCommand({ dir: "hello", agent: "pi", model: "anthropic/claude-sonnet-4-5", attempts: 3 })).toBe(
      "harbor run -p ./hello -a pi -m anthropic/claude-sonnet-4-5 -k 3",
    )
    expect(runCommand({ dir: "my task", agent: "opencode", forceBuild: true })).toBe(
      "harbor run -p './my task' -a opencode --force-build",
    )
  })
})

describe("requiredKeys", () => {
  it("names the provider key and the agent's own", () => {
    expect(requiredKeys("pi", "anthropic/claude-sonnet-4-5")).toEqual(["ANTHROPIC_API_KEY"])
    expect(requiredKeys("cursor-cli", "openai/gpt-5")).toEqual(["OPENAI_API_KEY", "CURSOR_API_KEY"])
    expect(requiredKeys("oracle", undefined)).toEqual([])
  })
})
