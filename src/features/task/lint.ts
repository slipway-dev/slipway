import { TASK_PATHS } from "@/features/harbor/constants"
import { validateTaskConfig } from "@/features/harbor/validate"

import type { ComposedTask, TaskFile } from "./compose"
import type { Issue } from "./issues"
import type { TaskProject } from "./model"

const TASK_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/

function find(files: TaskFile[], path: string): TaskFile | undefined {
  return files.find((f) => f.path === path)
}

/**
 * Checks a composed task the way Harbor will treat it. Rules cite Harbor's
 * behaviour (harbor 0.24 source), not convention, so an error here means
 * `harbor run` would fail or score the task wrongly.
 */
export function lintTask(project: TaskProject, composed: ComposedTask): Issue[] {
  const issues: Issue[] = [...composed.issues]
  const { files, config } = composed

  for (const error of validateTaskConfig(config)) {
    issues.push({
      severity: "error",
      code: "schema",
      message: `task.toml ${error.path} ${error.message}.`,
      params: { path: error.path, keyword: error.keyword, detail: error.message },
      path: TASK_PATHS.config,
    })
  }

  const name = config.task?.name
  if (config.task && (!name || !TASK_NAME.test(name))) {
    issues.push({
      severity: "error",
      code: "task-name",
      message: 'Task name must be "org/name", e.g. "my-org/hello-world".',
      path: TASK_PATHS.config,
    })
  }

  if (!project.instruction.trim()) {
    issues.push({
      severity: "error",
      code: "empty-instruction",
      message: "instruction.md is empty; the agent would get no task.",
      path: TASK_PATHS.instruction,
    })
  }

  const dockerfile = find(files, TASK_PATHS.dockerfile)
  const compose = find(files, TASK_PATHS.compose)
  if (!dockerfile && !compose && !config.environment?.docker_image) {
    issues.push({
      severity: "error",
      code: "no-environment",
      message: "No environment: add a base image, an environment/Dockerfile or [environment].docker_image.",
    })
  }
  if (dockerfile && !/^\s*FROM\s/im.test(dockerfile.content)) {
    issues.push({
      severity: "error",
      code: "dockerfile-from",
      message: "environment/Dockerfile has no FROM line.",
      path: TASK_PATHS.dockerfile,
    })
  }
  if (dockerfile && /^\s*(COPY|ADD)\s.*\bsolution\b/im.test(dockerfile.content)) {
    issues.push({
      severity: "error",
      code: "solution-leak",
      message: "The Dockerfile copies the solution into the image, so any agent can read it and nop may score above 0.",
      path: TASK_PATHS.dockerfile,
    })
  }
  if (dockerfile && /^\s*(COPY|ADD)\s.*\btests\b/im.test(dockerfile.content)) {
    issues.push({
      severity: "warning",
      code: "tests-leak",
      message: "The Dockerfile copies tests into the image; Harbor already copies tests/ to /tests after the agent finishes.",
      path: TASK_PATHS.dockerfile,
    })
  }
  if (dockerfile && /^\s*RUN\s+pip3?\s/im.test(dockerfile.content) && /^\s*FROM\s+(ubuntu|debian)/im.test(dockerfile.content)) {
    issues.push({
      severity: "warning",
      code: "pip-without-python",
      message: "pip is used on a plain Ubuntu/Debian image, which has no pip. Use a python base image or install python3-pip.",
      path: TASK_PATHS.dockerfile,
    })
  }

  const test = find(files, TASK_PATHS.testScript)
  if (!test) {
    issues.push({
      severity: "error",
      code: "no-verifier",
      message: "No tests/test.sh: add a verifier so Harbor can score the task.",
    })
  } else {
    if (!/reward\.(txt|json)/.test(test.content)) {
      issues.push({
        severity: "error",
        code: "missing-reward",
        message: "tests/test.sh never writes /logs/verifier/reward.txt or reward.json, so every trial will fail to score.",
        path: TASK_PATHS.testScript,
      })
    }
    if (/rewards\.json/.test(test.content)) {
      issues.push({
        severity: "warning",
        code: "rewards-json",
        message: "Harbor reads /logs/verifier/reward.json (singular); rewards.json is ignored.",
        path: TASK_PATHS.testScript,
      })
    }
    const verifierNetwork = config.verifier?.network_mode ?? config.environment?.network_mode
    if (
      verifierNetwork === "no-network" &&
      /\b(apt-get install|apt install|curl|wget|pip3? install|uvx|uv pip|npm install)\b/.test(test.content)
    ) {
      issues.push({
        severity: "error",
        code: "verifier-offline",
        message:
          "tests/test.sh downloads tools, but the verifier has no network, so every trial scores 0. Let the verifier reach the internet (Network policy) or install test tools in the image.",
        path: TASK_PATHS.testScript,
      })
    }
    if (!test.content.startsWith("#!")) {
      issues.push({
        severity: "warning",
        code: "shebang",
        message: "tests/test.sh has no #! line.",
        path: TASK_PATHS.testScript,
      })
    }
  }

  const solve = find(files, TASK_PATHS.solveScript)
  if (!solve) {
    issues.push({
      severity: "warning",
      code: "no-solution",
      message: "No solution/solve.sh: the oracle agent cannot show the task is solvable.",
    })
  } else if (!solve.content.split("\n").some((l) => l.trim() && !l.trim().startsWith("#"))) {
    issues.push({
      severity: "warning",
      code: "empty-solution",
      message: "solution/solve.sh has no commands yet, so oracle will score 0.",
      path: TASK_PATHS.solveScript,
    })
  }

  const order = { error: 0, warning: 1 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}
