import { baseImage } from "@/features/parts/builtin/environment"
import { shellSolution } from "@/features/parts/builtin/solution"
import { fileMatchVerifier, scriptVerifier } from "@/features/parts/builtin/verifier"
import { createBlock } from "@/features/parts/registry"

import type { TaskProject } from "./model"

/** Same defaults `harbor task init` writes. */
const DEFAULT_TIMEOUTS = {
  verifier: { timeout_sec: 900 },
  agent: { timeout_sec: 900 },
  environment: { build_timeout_sec: 600 },
}

export function emptyProject(): TaskProject {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    instruction: "",
    config: {},
    blocks: { environment: [], verifier: [], solution: [] },
    overrides: {},
  }
}

export type StarterId = "hello-world" | "blank"

export const STARTERS: { id: StarterId; name: string; summary: string }[] = [
  {
    id: "hello-world",
    name: "Hello, world",
    summary: "A complete task: the agent writes one file, the verifier checks it, the solution shows it works.",
  },
  {
    id: "blank",
    name: "Blank",
    summary: "What `harbor task init` gives you: an Ubuntu image and empty verifier and solution scripts.",
  },
]

export function createStarter(id: StarterId): TaskProject {
  const project = emptyProject()
  if (id === "hello-world") {
    project.instruction =
      'Create a file at `/app/hello.txt` that contains exactly `Hello, world!`.'
    project.config = {
      task: {
        name: "my-org/hello-world",
        description: "Write a greeting to a file.",
        authors: [],
        keywords: ["starter"],
      },
      metadata: { difficulty: "easy", category: "file-operations" },
      ...structuredClone(DEFAULT_TIMEOUTS),
    }
    project.blocks = {
      environment: [createBlock(baseImage)],
      verifier: [
        createBlock(fileMatchVerifier, { path: "/app/hello.txt", expected: "Hello, world!" }),
      ],
      solution: [
        createBlock(shellSolution, {
          script: '#!/bin/bash\n\necho "Hello, world!" > /app/hello.txt\n',
        }),
      ],
    }
    return project
  }

  project.config = {
    task: { name: "my-org/new-task", description: "", authors: [], keywords: [] },
    metadata: {},
    ...structuredClone(DEFAULT_TIMEOUTS),
  }
  project.blocks = {
    environment: [createBlock(baseImage)],
    verifier: [createBlock(scriptVerifier)],
    solution: [createBlock(shellSolution)],
  }
  return project
}
