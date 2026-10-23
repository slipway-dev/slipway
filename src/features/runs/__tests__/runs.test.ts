import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { contentText, findSubagent, pairToolCalls, parseTrajectory, totals } from "../atif"
import { auditTrajectory, worstSeverity, type Finding } from "../audit"
import { parseCtrf } from "../ctrf"
import { discoverJobs } from "../discover"
import { filesFromZip, readJson, readText, type FileSet } from "../files"
import { indexJob, trajectoryPath } from "../job"
import type { Trajectory } from "../types"

const FIXTURE = join(__dirname, "../__fixtures__/sample-job")
const JOB = "2026-10-20__14-02-11"
const HONEST = "csv-stats__a1B2c3D"
const CHEAT = "csv-stats__x9Y8z7W"
const TIMEOUT = "csv-stats__q4R5s6T"

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function fixtureFiles(prefix = ""): FileSet {
  const files: FileSet = new Map()
  for (const path of walk(FIXTURE)) {
    files.set(prefix + relative(FIXTURE, path), new Blob([readFileSync(path)]))
  }
  return files
}

async function trajectoryOf(files: FileSet, trial: string): Promise<Trajectory> {
  const parsed = parseTrajectory((await readText(files, trajectoryPath(trial)))!)
  expect(parsed.error).toBeUndefined()
  return parsed.trajectory!
}

async function jobFiles(): Promise<FileSet> {
  const [job] = await discoverJobs(fixtureFiles())
  return job.files
}

const rules = (findings: Finding[]) => findings.map((f) => `${f.stepId}:${f.rule}`)

describe("discoverJobs", () => {
  it("finds the job and its trials in a jobs folder", async () => {
    const jobs = await discoverJobs(fixtureFiles())
    expect(jobs).toHaveLength(1)
    expect(jobs[0].name).toBe(JOB)
    expect(jobs[0].id).toBe("6f1c2a8e-3b7d-4e59-9a40-1d2e3f4a5b6c")
    expect(jobs[0].files.has(`${HONEST}/agent/trajectory.json`)).toBe(true)
  })

  it("reads the bundled sample zip, which matches the fixture", async () => {
    const zip = filesFromZip(readFileSync(join(__dirname, "../../../../public/samples/sample-job.zip")))
    const fixture = fixtureFiles()
    expect([...zip.files.keys()].sort()).toEqual([...fixture.keys()].sort())
    for (const [path, blob] of fixture) {
      expect(await zip.files.get(path)!.text(), path).toBe(await blob.text())
    }
  })

  it("finds several jobs under one folder", async () => {
    const files = fixtureFiles("jobs/")
    for (const [path, blob] of fixtureFiles("jobs/").entries()) {
      files.set(path.replace(JOB, "2026-10-21__09-00-00"), blob)
    }
    const jobs = await discoverJobs(files)
    expect(jobs.map((j) => j.name)).toEqual(["2026-10-20__14-02-11", "2026-10-21__09-00-00"])
  })

  it("wraps a single trial folder in a job", async () => {
    const files: FileSet = new Map()
    for (const [path, blob] of fixtureFiles()) {
      const prefix = `${JOB}/${CHEAT}/`
      if (path.startsWith(prefix)) files.set(path.slice(prefix.length), blob)
    }
    const [job] = await discoverJobs(files)
    expect(job.name).toBe(CHEAT)
    expect((await indexJob(job.files)).trials.map((t) => t.name)).toEqual([CHEAT])
  })

  it("accepts a lone trajectory file", async () => {
    const blob = fixtureFiles().get(`${JOB}/${HONEST}/agent/trajectory.json`)!
    const [job] = await discoverJobs(new Map([["run.json", blob]]))
    expect(job.files.has("run/agent/trajectory.json")).toBe(true)
  })

  it("finds nothing in unrelated files", async () => {
    expect(await discoverJobs(new Map([["notes.txt", new Blob(["hi"])]]))).toEqual([])
  })
})

describe("indexJob", () => {
  it("summarizes each trial", async () => {
    const { result, trials } = await indexJob(await jobFiles())
    expect(result?.n_total_trials).toBe(3)
    const byName = Object.fromEntries(trials.map((t) => [t.name, t]))
    expect(byName[HONEST]).toMatchObject({
      agent: "claude-code",
      model: "anthropic/claude-sonnet-5-5",
      reward: 1,
      status: "pass",
      durationSec: 70,
      costUsd: 0.0748,
    })
    expect(byName[CHEAT]).toMatchObject({ agent: "terminus-2", status: "pass" })
    expect(byName[TIMEOUT]).toMatchObject({ status: "error", reward: 0 })
  })

  it("falls back to reward.txt when result.json is missing", async () => {
    const files = await jobFiles()
    files.delete(`${CHEAT}/result.json`)
    const { trials } = await indexJob(files)
    expect(trials.find((t) => t.name === CHEAT)).toMatchObject({ reward: 1, status: "pass", agent: "terminus-2" })
  })
})

describe("ATIF", () => {
  it("pairs tool calls with their results", async () => {
    const t = await trajectoryOf(await jobFiles(), CHEAT)
    const batch = pairToolCalls(t.steps[1])
    expect(batch.pairs.map((p) => p.results.length)).toEqual([0, 0])
    expect(contentText(batch.unpaired[0].content)).toContain("/solution:\nsolve.sh")
    const single = pairToolCalls(t.steps[2])
    expect(single.pairs[0].results).toHaveLength(1)
    expect(single.unpaired).toEqual([])
  })

  it("resolves embedded subagents and totals metrics", async () => {
    const t = await trajectoryOf(await jobFiles(), HONEST)
    expect(findSubagent(t, "verify-answer-1")?.agent.name).toBe("claude-code-subagent")
    expect(totals(t)).toMatchObject({ steps: 6, toolCalls: 4, promptTokens: 22973, costUsd: 0.0748, durationSec: 40 })
  })

  it("reports what Harbor's validators would reject without refusing to show it", () => {
    const parsed = parseTrajectory(
      JSON.stringify({
        schema_version: "ATIF-v2.0",
        agent: { name: "x" },
        steps: [
          { step_id: 1, source: "user", message: "hi" },
          {
            step_id: 3,
            source: "agent",
            message: "",
            observation: { results: [{ source_call_id: "missing", content: "?" }] },
          },
        ],
      }),
    )
    expect(parsed.trajectory?.steps).toHaveLength(2)
    expect(parsed.warnings.join("\n")).toMatch(/newer than Slipway knows/)
    expect(parsed.warnings.join("\n")).toMatch(/step_id 3/)
    expect(parsed.warnings.join("\n")).toMatch(/unknown tool call missing/)
    expect(parseTrajectory("{}").error).toMatch(/Not an ATIF trajectory/)
    expect(parseTrajectory("nope").error).toMatch(/Not valid JSON/)
  })
})

describe("auditTrajectory", () => {
  it("finds nothing in an honest run, including its subagent", async () => {
    expect(auditTrajectory(await trajectoryOf(await jobFiles(), HONEST))).toEqual([])
  })

  it("flags reading the solution and writing the reward", async () => {
    const findings = auditTrajectory(await trajectoryOf(await jobFiles(), CHEAT))
    expect(rules(findings)).toEqual([
      "2:solution-access",
      "3:solution-access",
      "4:solution-access",
      "4:reward-write",
    ])
    expect(findings[3].evidence).toContain("echo 1 > /logs/verifier/reward.txt")
    expect(worstSeverity(findings)).toBe("error")
  })

  it("flags editing tests but not running them", async () => {
    const findings = auditTrajectory(await trajectoryOf(await jobFiles(), TIMEOUT))
    expect(rules(findings)).toEqual(["3:test-edit"])
    expect(findings[0].evidence).toBe("/app/tests/test_stats.py")
  })

  it("ignores paths that only contain the words", () => {
    const t: Trajectory = {
      agent: { name: "x" },
      steps: [
        {
          step_id: 1,
          source: "agent",
          message: "",
          tool_calls: [
            { tool_call_id: "a", function_name: "Bash", arguments: { command: "python /app/solution.py > out.txt" } },
            { tool_call_id: "b", function_name: "Read", arguments: { file_path: "/app/tests/fixtures/input.txt" } },
            { tool_call_id: "c", function_name: "Bash", arguments: { command: "pytest tests/ -q 2>&1 | tail" } },
          ],
        },
      ],
    }
    expect(auditTrajectory(t)).toEqual([])
  })

  it("flags shell edits of tests and attributes subagent findings", () => {
    const t: Trajectory = {
      agent: { name: "x" },
      steps: [{ step_id: 1, source: "user", message: "cat /solution/solve.sh" }],
      subagent_trajectories: [
        {
          trajectory_id: "helper",
          agent: { name: "sub" },
          steps: [
            {
              step_id: 1,
              source: "agent",
              message: "",
              tool_calls: [
                { tool_call_id: "s", function_name: "bash", arguments: { cmd: "sed -i 's/== 3/== 4/' tests/test_math.py" } },
              ],
            },
          ],
        },
      ],
    }
    expect(auditTrajectory(t).map((f) => [f.trajectory, f.rule])).toEqual([["helper", "test-edit"]])
  })
})

describe("parseCtrf", () => {
  it("reads the verifier's test report", async () => {
    const report = parseCtrf(await readJson(await jobFiles(), `${TIMEOUT}/verifier/ctrf.json`))
    expect(report?.tool).toBe("pytest")
    expect(report?.tests.map((t) => t.status)).toEqual(["failed", "failed"])
    expect(parseCtrf({})).toBeUndefined()
  })
})
