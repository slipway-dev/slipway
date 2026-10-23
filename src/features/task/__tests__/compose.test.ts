import { describe, expect, it } from "vitest"

import { parseTaskConfig } from "@/features/harbor/toml"
import { validateTaskConfig } from "@/features/harbor/validate"
import { baseImage, mcpServer, resources } from "@/features/parts/builtin/environment"
import { pytestVerifier } from "@/features/parts/builtin/verifier"
import { makeNode } from "@/features/flow/types"
import { validateManifest } from "@/features/parts/manifest"
import { BUILTIN_PARTS } from "@/features/parts/registry"
import { createBlock, createLookup } from "@/features/parts/registry"

import { buildTaskZip, importTaskZip } from "../archive"
import { composeTask } from "../compose"
import { lintTask } from "../lint"
import { taskDirName } from "../model"
import { createStarter } from "../starters"

const lookup = createLookup()

function file(composed: ReturnType<typeof composeTask>, path: string) {
  return composed.files.find((f) => f.path === path)
}

describe("composeTask", () => {
  it("builds the hello-world starter as a complete Harbor task", () => {
    const composed = composeTask(createStarter("hello-world"), lookup)
    expect(composed.files.map((f) => f.path)).toEqual([
      "task.toml",
      "instruction.md",
      "environment/Dockerfile",
      "tests/test.sh",
      "solution/solve.sh",
    ])
    expect(file(composed, "environment/Dockerfile")?.content).toBe(
      "FROM ubuntu:24.04\n\nWORKDIR /app\n",
    )
    expect(file(composed, "tests/test.sh")?.executable).toBe(true)
    expect(file(composed, "solution/solve.sh")?.executable).toBe(true)
    const verifier = file(composed, "tests/test.sh")!.content
    expect(verifier).toContain("[ -f '/app/hello.txt' ]")
    expect(verifier).toContain("echo \"$reward\" > '/logs/verifier/reward.txt'")
    expect(file(composed, "solution/solve.sh")?.content).toContain("cat > '/app/hello.txt' <<'SLIPWAY_EOF'\nHello, world!\nSLIPWAY_EOF")

    const toml = file(composed, "task.toml")!.content
    expect(toml.startsWith('schema_version = "1.4"')).toBe(true)
    expect(toml).toContain("timeout_sec = 900.0")
    expect(parseTaskConfig(toml).task?.name).toBe("my-org/hello-world")
  })

  it("passes lint with no errors or warnings", () => {
    const project = createStarter("hello-world")
    expect(lintTask(project, composeTask(project, lookup))).toEqual([])
  })

  it("orders Dockerfile sections regardless of block order", () => {
    const project = createStarter("blank")
    project.blocks.environment = [
      createBlock(lookup("slipway/run-commands")!, { script: "make" }),
      createBlock(lookup("slipway/apt-packages")!, { packages: ["make"] }),
      createBlock(baseImage, { image: "debian:bookworm-slim", workdir: "" }),
    ]
    const dockerfile = file(composeTask(project, lookup), "environment/Dockerfile")!.content
    expect(dockerfile.indexOf("FROM")).toBe(0)
    expect(dockerfile).not.toContain("WORKDIR")
    expect(dockerfile.indexOf("apt-get")).toBeLessThan(dockerfile.indexOf("RUN <<'EOF'"))
  })

  it("merges config contributions and drops empty values", () => {
    const project = createStarter("hello-world")
    project.blocks.environment.push(
      createBlock(resources, { cpus: 2, memory_mb: 4096 }),
      createBlock(mcpServer, { name: "docs", url: "http://localhost:8000/mcp" }),
      createBlock(mcpServer, { name: "fs", transport: "stdio", command: "mcp-fs" }),
    )
    const { config } = composeTask(project, lookup)
    expect(config.environment).toMatchObject({ cpus: 2, memory_mb: 4096, build_timeout_sec: 600 })
    expect(config.environment).not.toHaveProperty("gpus")
    expect(config.environment?.mcp_servers).toEqual([
      { name: "docs", transport: "streamable-http", url: "http://localhost:8000/mcp" },
      { name: "fs", transport: "stdio", command: "mcp-fs" },
    ])
    expect(validateTaskConfig(config)).toEqual([])
  })

  it("flags two parts with the same role", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier.push(createBlock(pytestVerifier))
    const composed = composeTask(project, lookup)
    expect(composed.issues.map((i) => i.code)).toContain("role-conflict")
  })

  it("lets a hand edit replace generated content", () => {
    const project = createStarter("hello-world")
    project.overrides["environment/Dockerfile"] = { content: "FROM alpine\n" }
    const dockerfile = file(composeTask(project, lookup), "environment/Dockerfile")!
    expect(dockerfile.content).toBe("FROM alpine\n")
    expect(dockerfile.origin.kind).toBe("override")
    expect(dockerfile.replaces).toEqual({ kind: "generated", by: "dockerfile" })
  })
})

describe("lintTask", () => {
  it("explains what a blank task still needs", () => {
    const project = createStarter("blank")
    const codes = lintTask(project, composeTask(project, lookup)).map((i) => i.code)
    expect(codes).toEqual(["empty-instruction", "empty-solution"])
  })

  it("catches a verifier that never writes a reward", () => {
    const project = createStarter("blank")
    project.instruction = "Do it."
    project.overrides["tests/test.sh"] = { content: "#!/bin/bash\necho rewards.json\n" }
    const codes = lintTask(project, composeTask(project, lookup)).map((i) => i.code)
    expect(codes).toContain("missing-reward")
    expect(codes).toContain("rewards-json")
  })

  it("reports task.toml values Harbor's schema rejects", () => {
    const project = createStarter("hello-world")
    project.config.agent = { timeout_sec: "soon" as unknown as number }
    const issues = lintTask(project, composeTask(project, lookup))
    expect(issues.find((i) => i.code === "schema")?.message).toMatch(/agent\.timeout_sec/)
  })

  it("catches a verifier that needs the network it does not have", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier = [createBlock(pytestVerifier)]
    const network = createBlock(lookup("slipway/network")!, { verifier_online: false })
    project.blocks.environment.push(network)
    const codes = () => lintTask(project, composeTask(project, lookup)).map((i) => i.code)
    expect(codes()).toContain("verifier-offline")

    network.params.verifier_online = true
    expect(codes()).not.toContain("verifier-offline")
    expect(composeTask(project, lookup).config.verifier?.network_mode).toBe("public")
  })

  it("catches a solution copied into the image", () => {
    const project = createStarter("hello-world")
    project.overrides["environment/Dockerfile"] = {
      content: "FROM ubuntu:24.04\nCOPY solution/solve.sh /app/\n",
    }
    const codes = lintTask(project, composeTask(project, lookup)).map((i) => i.code)
    expect(codes).toContain("solution-leak")
  })
})

describe("archive", () => {
  it("round-trips a launched task through import", () => {
    const project = createStarter("hello-world")
    const composed = composeTask(project, lookup)
    const zip = buildTaskZip(taskDirName(project), composed.files)

    const [imported] = importTaskZip(zip).projects
    const recomposed = composeTask(imported, lookup)
    const contents = (c: typeof composed) =>
      Object.fromEntries(c.files.map((f) => [f.path, [f.content, f.executable]]))
    expect(contents(recomposed)).toEqual(contents(composed))
    expect(imported.config.task?.name).toBe("my-org/hello-world")
  })

  it("rejects archives without task.toml", async () => {
    const { zipSync, strToU8 } = await import("fflate")
    const zip = zipSync({ "x/readme.md": strToU8("hi") })
    expect(() => importTaskZip(zip)).toThrow(/No task.toml/)
  })
})

describe("cleared params", () => {
  it("drops a cleared number instead of falling back to its default", () => {
    const project = createStarter("hello-world")
    project.blocks.environment.push(createBlock(resources, { cpus: "" }))
    const { config } = composeTask(project, lookup)
    expect(config.environment).not.toHaveProperty("cpus")
    expect(config.environment?.memory_mb).toBe(2048)
  })
})

describe("importing tasks", () => {
  it("imports every task in a folder of tasks", async () => {
    const { strToU8, zipSync } = await import("fflate")
    const zip = zipSync({
      "dataset/one/task.toml": strToU8('[task]\nname = "org/one"\n'),
      "dataset/one/instruction.md": strToU8("First."),
      "dataset/two/task.toml": strToU8('[task]\nname = "org/two"\n'),
      "dataset/two/tests/test.sh": strToU8("#!/bin/bash\n"),
      "dataset/README.md": strToU8("not part of a task"),
    })
    const { projects, skipped } = importTaskZip(zip)
    expect(projects.map((p) => p.config.task?.name)).toEqual(["org/one", "org/two"])
    expect(projects[0].instruction).toBe("First.")
    expect(Object.keys(projects[1].overrides)).toEqual(["tests/test.sh"])
    expect(skipped).toEqual([])
  })

  it("keeps binary files byte for byte through Launch", async () => {
    const { strToU8, unzipSync, zipSync } = await import("fflate")
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 255, 254])
    const { projects } = importTaskZip(
      zipSync({ "t/task.toml": strToU8('[task]\nname = "org/t"\n'), "t/environment/logo.png": png }),
    )
    expect(projects[0].overrides["environment/logo.png"].encoding).toBe("base64")
    const composed = composeTask(projects[0], lookup)
    const out = unzipSync(buildTaskZip("t", composed.files))
    expect(out["t/environment/logo.png"]).toEqual(png)
  })

  it("skips a task whose task.toml does not parse, and keeps the others", async () => {
    const { strToU8, zipSync } = await import("fflate")
    const { projects, skipped } = importTaskZip(
      zipSync({ "a/task.toml": strToU8("[task\nname ="), "b/task.toml": strToU8('[task]\nname = "org/b"\n') }),
    )
    expect(projects.map((p) => p.config.task?.name)).toEqual(["org/b"])
    expect(skipped[0].path).toBe("a/")
    expect(skipped[0].reason).toMatch(/not imported/)
  })
})

describe("precompiled validator", () => {
  it("matches task-schema.json (run pnpm harbor:schema after changing it)", async () => {
    const { readFileSync } = await import("node:fs")
    const { buildTaskValidator } = await import("../../../../scripts/build-validators.mjs")
    const committed = readFileSync(new URL("../../harbor/task-schema.validate.js", import.meta.url), "utf8")
    expect(committed).toBe(buildTaskValidator())
  })
})

describe("issue params for translation", () => {
  it("carries the values each dynamic message interpolates", () => {
    const project = createStarter("hello-world")
    project.blocks.verifier.push(createBlock(pytestVerifier))
    project.blocks.environment.push(createBlock(lookup("slipway/apt-packages")!, { packages: [] }))
    const issues = composeTask(project, lookup).issues
    expect(issues.find((i) => i.code === "role-conflict")?.params).toEqual({
      role: "runner",
      part: "pytest",
      partId: "slipway/pytest",
      holder: "Checks",
      holderId: "slipway/checks",
    })
    expect(issues.find((i) => i.code === "missing-param")?.params).toEqual({
      part: "apt packages",
      partId: "slipway/apt-packages",
      param: "Packages",
      paramKey: "packages",
    })
  })

  it("gives schema issues the failing keyword", () => {
    const project = createStarter("hello-world")
    project.config.agent = { timeout_sec: "soon" as unknown as number }
    const schema = lintTask(project, composeTask(project, lookup)).find((i) => i.code === "schema")
    expect(schema?.params).toMatchObject({ path: "agent.timeout_sec", keyword: "type" })
    expect(schema?.message).toMatch(/agent\.timeout_sec/)
  })
})

describe("checks and steps parts", () => {
  const verifierBlock = (project: ReturnType<typeof createStarter>) => project.blocks.verifier[0]
  const solutionBlock = (project: ReturnType<typeof createStarter>) => project.blocks.solution[0]

  it("are valid manifests", () => {
    for (const id of ["slipway/checks", "slipway/solution-steps"]) {
      expect(validateManifest(BUILTIN_PARTS.find((p) => p.id === id)), id).toEqual([])
    }
    const bad = validateManifest({
      ...BUILTIN_PARTS.find((p) => p.id === "slipway/checks"),
      params: [{ key: "flow", label: "Checks", type: "flow" }],
    })
    expect(bad.join("\n")).toMatch(/flow must be "checks" or "steps"/)
  })

  it("write the verifier and the solution from their lists", () => {
    const project = createStarter("hello-world")
    ;(verifierBlock(project).params.flow as { nodes: unknown[] }).nodes.push(
      makeNode("checks", "file-contains", { path: "/app/hello.txt", text: "world", weight: 2 }),
    )
    ;(verifierBlock(project).params.flow as { reward: string }).reward = "weighted"
    const composed = composeTask(project, lookup)
    const script = file(composed, "tests/test.sh")!.content
    expect(script).toContain("possible=$((possible + 2))")
    expect(script).toContain("scaled=$((earned * 10000 / possible))")
    expect(file(composed, "tests/test.sh")?.origin).toMatchObject({ kind: "part", partId: "slipway/checks" })
    expect(file(composed, "solution/solve.sh")?.origin).toMatchObject({ kind: "part", partId: "slipway/solution-steps" })
    expect(lintTask(project, composed).map((i) => i.code)).toEqual([])
  })

  it("name the node that is not finished instead of passing it", () => {
    const project = createStarter("hello-world")
    const nodes = (verifierBlock(project).params.flow as { nodes: unknown[] }).nodes
    nodes.push(makeNode("checks", "file-exists", { path: "hello.txt" }))
    const issue = lintTask(project, composeTask(project, lookup)).find((i) => i.code === "flow-incomplete")
    expect(issue?.params).toMatchObject({ partId: "slipway/checks", problem: "not-absolute", field: "path" })
    expect(issue?.blockId).toBe(verifierBlock(project).id)
    expect(issue?.message).toBe('Checks: "file exists: hello.txt" path must be an absolute path, starting with /.')
  })

  it("ask for at least one check and one step", () => {
    const project = createStarter("hello-world")
    ;(verifierBlock(project).params.flow as { nodes: unknown[] }).nodes.length = 0
    ;(solutionBlock(project).params.flow as { nodes: unknown[] }).nodes.length = 0
    const codes = composeTask(project, lookup).issues.map((i) => `${i.code}:${i.params?.paramKey}`)
    expect(codes).toEqual(["missing-param:flow", "missing-param:flow"])
  })

  it("survive Launch and import as they are", () => {
    const project = createStarter("hello-world")
    const composed = composeTask(project, lookup)
    const [imported] = importTaskZip(buildTaskZip("hello", composed.files)).projects
    const again = composeTask(imported, lookup)
    expect(again.files.find((f) => f.path === "tests/test.sh")?.content).toBe(file(composed, "tests/test.sh")!.content)
  })
})
