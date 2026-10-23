import type { NetworkMode } from "./constants"

/**
 * The parts of Harbor's TaskConfig (task.toml) that Slipway edits directly.
 * Anything else a task carries is preserved through the index signatures and
 * checked against task-schema.json.
 */
export interface TaskConfig {
  schema_version?: string
  task?: PackageInfo
  metadata?: Record<string, unknown>
  verifier?: VerifierConfig
  agent?: AgentConfig
  environment?: EnvironmentConfig
  solution?: { env?: Record<string, string>; [key: string]: unknown }
  [key: string]: unknown
}

export interface Author {
  name: string
  email?: string
}

export interface PackageInfo {
  /** org/name, e.g. "harbor/hello-world". */
  name: string
  version?: string
  description?: string
  authors?: Author[]
  keywords?: string[]
  [key: string]: unknown
}

export interface AgentConfig {
  timeout_sec?: number
  user?: string | number
  network_mode?: NetworkMode
  allowed_hosts?: string[]
  [key: string]: unknown
}

export interface VerifierConfig {
  timeout_sec?: number
  env?: Record<string, string>
  user?: string | number
  network_mode?: NetworkMode
  allowed_hosts?: string[]
  [key: string]: unknown
}

export interface McpServerConfig {
  name: string
  transport?: "stdio" | "sse" | "streamable-http"
  url?: string
  command?: string
  args?: string[]
}

export interface EnvironmentConfig {
  build_timeout_sec?: number
  docker_image?: string
  os?: "linux" | "windows"
  cpus?: number
  memory_mb?: number
  storage_mb?: number
  gpus?: number
  network_mode?: NetworkMode
  allowed_hosts?: string[]
  mcp_servers?: McpServerConfig[]
  env?: Record<string, string>
  workdir?: string
  [key: string]: unknown
}

/** Top-level key order Slipway writes, matching `harbor task init`. */
export const CONFIG_KEY_ORDER = [
  "schema_version",
  "task",
  "metadata",
  "verifier",
  "agent",
  "environment",
  "solution",
] as const
