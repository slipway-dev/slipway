import { isFlowValue, type FlowNode } from "@/features/flow/types"
import { normalizePath } from "@/features/flow/vfs"
import type { TaskProject } from "@/features/task/model"
import type { TaskSimulation } from "@/features/task/simulate"

/** Every path the task already talks about, so a path field can offer them while you type. */
export function pathSuggestions(project: TaskProject, simulation: TaskSimulation): string[] {
  const paths = new Set<string>()
  const add = (raw: unknown) => {
    const path = typeof raw === "string" ? normalizePath(raw) : undefined
    if (path && path !== "/") paths.add(path)
  }
  const fromNodes = (nodes: FlowNode[]) => nodes.forEach((n) => add(n.path))

  for (const slot of ["verifier", "solution"] as const) {
    for (const block of project.blocks[slot]) {
      if (!block.disabled && isFlowValue(block.params.flow)) fromNodes(block.params.flow.nodes)
    }
  }
  for (const scenario of project.scenarios ?? []) fromNodes(scenario.steps)
  for (const file of simulation.initial.files.keys()) add(file)
  for (const dir of simulation.initial.dirs) add(dir)
  return [...paths].sort()
}
