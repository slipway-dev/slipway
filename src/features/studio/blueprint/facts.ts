import { isFlowValue, type FlowNode } from "@/features/flow/types"
import type { Block, ParamValue } from "@/features/parts/types"
import type { TaskProject } from "@/features/task/model"

/**
 * The few numbers and names that say what each part currently holds, for
 * the blueprint's overview. Plain data; the UI words it.
 */
export interface TaskFacts {
  instruction: { firstLine: string; words: number; lines: number; headings: number }
  environment: {
    image?: string
    workdir?: string
    packages: string[]
    files: number
    cpus?: number
    memoryMb?: number
    network?: string
  }
  verifier: { runner?: string; checks: FlowNode[]; reward: "all" | "weighted"; timeoutSec?: number }
  solution: { runner?: string; steps: FlowNode[] }
  settings: { name: string; version?: string; authors: number; agentTimeoutSec?: number; keywords: string[] }
}

const live = (blocks: Block[]) => blocks.filter((b) => !b.disabled)
const str = (v: ParamValue | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined)
const num = (v: ParamValue | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)
const list = (v: ParamValue | undefined) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x) : [])

/** Words separated by spaces, plus each CJK character, which is how Chinese and Japanese count length. */
export function countWords(text: string): number {
  const cjk = text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0
  const rest = text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, " ").trim()
  return cjk + (rest ? rest.split(/\s+/).length : 0)
}

const PACKAGE_PARTS = ["slipway/apt-packages", "slipway/pip-packages", "slipway/npm-packages"]

function flowNodes(block: Block | undefined): FlowNode[] {
  const flow = block?.params.flow
  return isFlowValue(flow) ? flow.nodes : []
}

export function taskFacts(project: TaskProject): TaskFacts {
  const env = live(project.blocks.environment)
  const find = (id: string) => env.find((b) => b.partId === id)
  const base = find("slipway/base-image")
  const resources = find("slipway/resources")
  const network = find("slipway/network")

  const verifier = live(project.blocks.verifier)
  const checks = verifier.find((b) => b.partId === "slipway/checks")
  const checksFlow = checks?.params.flow
  const solution = live(project.blocks.solution)
  const steps = solution.find((b) => b.partId === "slipway/solution-steps")

  const text = project.instruction.trim()
  const config = project.config

  return {
    instruction: {
      firstLine: text.split("\n").find((l) => l.trim())?.trim() ?? "",
      words: countWords(text),
      lines: text ? text.split("\n").length : 0,
      headings: text.split("\n").filter((l) => /^#{1,6}\s/.test(l)).length,
    },
    environment: {
      image: str(base?.params.image),
      workdir: str(base?.params.workdir),
      packages: env.filter((b) => PACKAGE_PARTS.includes(b.partId)).flatMap((b) => list(b.params.packages)),
      files: env.filter((b) => b.partId === "slipway/environment-file").length,
      cpus: num(resources?.params.cpus) ?? config.environment?.cpus,
      memoryMb: num(resources?.params.memory_mb) ?? config.environment?.memory_mb,
      network: str(network?.params.mode) ?? config.environment?.network_mode,
    },
    verifier: {
      runner: verifier[0]?.partId,
      checks: flowNodes(checks),
      reward: isFlowValue(checksFlow) && checksFlow.reward === "weighted" ? "weighted" : "all",
      timeoutSec: config.verifier?.timeout_sec,
    },
    solution: { runner: solution[0]?.partId, steps: flowNodes(steps) },
    settings: {
      name: config.task?.name?.trim() ?? "",
      version: config.task?.version,
      authors: config.task?.authors?.length ?? 0,
      agentTimeoutSec: config.agent?.timeout_sec,
      keywords: config.task?.keywords ?? [],
    },
  }
}
