/**
 * Facts about Harbor's task format, taken from the harbor package source
 * (harbor.models.task.paths, harbor.models.trial.paths). Keep in step with
 * task-schema.json via scripts/sync-harbor-schema.sh.
 */

export const HARBOR_VERSION = "0.24.0"
export const TASK_SCHEMA_VERSION = "1.4"

/** Paths inside a task directory. */
export const TASK_PATHS = {
  config: "task.toml",
  instruction: "instruction.md",
  readme: "README.md",
  environmentDir: "environment",
  dockerfile: "environment/Dockerfile",
  compose: "environment/docker-compose.yaml",
  testsDir: "tests",
  testScript: "tests/test.sh",
  solutionDir: "solution",
  solveScript: "solution/solve.sh",
} as const

/** Paths inside the running container. */
export const CONTAINER_PATHS = {
  tests: "/tests",
  solution: "/solution",
  verifierLogs: "/logs/verifier",
  rewardText: "/logs/verifier/reward.txt",
  rewardJson: "/logs/verifier/reward.json",
  agentLogs: "/logs/agent",
  artifacts: "/logs/artifacts",
} as const

export const NETWORK_MODES = ["public", "no-network", "allowlist"] as const
export type NetworkMode = (typeof NETWORK_MODES)[number]

export const MCP_TRANSPORTS = ["stdio", "sse", "streamable-http"] as const
