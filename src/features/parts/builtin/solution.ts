import type { PartManifest } from "../types"

export const shellSolution: PartManifest = {
  id: "slipway/shell-solution",
  version: "1.0.0",
  name: "Solve script",
  summary: "solution/solve.sh, run by the oracle agent. A task whose oracle scores 1 is solvable.",
  slot: "solution",
  role: "solver",
  params: [
    {
      key: "script",
      label: "solution/solve.sh",
      type: "code",
      language: "bash",
      required: true,
      default: "#!/bin/bash\n\n# Solve the task the way an agent should.\n",
    },
  ],
  contributes: {
    files: [{ path: "solution/solve.sh", template: "{{script}}", executable: true }],
  },
}

export const solutionFile: PartManifest = {
  id: "slipway/solution-file",
  version: "1.0.0",
  name: "Solution file",
  summary: "A helper file next to solve.sh, available at /solution in the container.",
  slot: "solution",
  params: [
    { key: "path", label: "Path in solution/", type: "string", default: "answer.txt", required: true },
    { key: "content", label: "Content", type: "code", default: "", language: "text" },
  ],
  contributes: {
    files: [{ path: "solution/{{path}}", template: "{{content}}" }],
  },
}

export const solutionParts = [shellSolution, solutionFile]
