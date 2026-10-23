import type { PartManifest } from "../types"

export const baseImage: PartManifest = {
  id: "slipway/base-image",
  version: "1.0.0",
  name: "Base image",
  summary: "The FROM line and working directory every environment starts with.",
  slot: "environment",
  role: "base",
  params: [
    {
      key: "image",
      label: "Image",
      type: "string",
      default: "ubuntu:24.04",
      required: true,
      suggestions: [
        "ubuntu:24.04",
        "debian:bookworm-slim",
        "python:3.13-slim",
        "node:22-bookworm-slim",
        "golang:1.24-bookworm",
        "rust:1-slim-bookworm",
      ],
    },
    {
      key: "workdir",
      label: "Working directory",
      type: "string",
      default: "/app",
      description: "Where the agent starts. Leave empty to keep the image's default.",
    },
  ],
  contributes: {
    dockerfile: [
      {
        section: "base",
        template: "FROM {{image}}\n{{#if workdir}}\nWORKDIR {{workdir}}\n{{/if}}",
      },
    ],
  },
}

export const aptPackages: PartManifest = {
  id: "slipway/apt-packages",
  version: "1.0.0",
  name: "apt packages",
  summary: "System packages installed with apt-get on Debian and Ubuntu images.",
  slot: "environment",
  params: [
    {
      key: "packages",
      label: "Packages",
      type: "list",
      default: ["curl", "git"],
      required: true,
      placeholder: "build-essential",
    },
  ],
  contributes: {
    dockerfile: [
      {
        section: "system",
        template:
          "RUN apt-get update \\\n    && apt-get install -y --no-install-recommends {{packages}} \\\n    && rm -rf /var/lib/apt/lists/*\n",
      },
    ],
  },
}

export const pipPackages: PartManifest = {
  id: "slipway/pip-packages",
  version: "1.0.0",
  name: "pip packages",
  summary: "Python packages installed with pip. Use with a python base image.",
  slot: "environment",
  params: [
    {
      key: "packages",
      label: "Packages",
      type: "list",
      default: [],
      required: true,
      placeholder: "numpy==2.3.0",
    },
  ],
  contributes: {
    dockerfile: [
      {
        section: "runtime",
        template: "RUN pip install --no-cache-dir {{packages}}\n",
      },
    ],
  },
}

export const npmPackages: PartManifest = {
  id: "slipway/npm-packages",
  version: "1.0.0",
  name: "npm packages",
  summary: "Global npm packages. Use with a node base image.",
  slot: "environment",
  params: [
    {
      key: "packages",
      label: "Packages",
      type: "list",
      default: [],
      required: true,
      placeholder: "typescript@5",
    },
  ],
  contributes: {
    dockerfile: [
      {
        section: "runtime",
        template: "RUN npm install -g {{packages}}\n",
      },
    ],
  },
}

export const environmentFile: PartManifest = {
  id: "slipway/environment-file",
  version: "1.0.0",
  name: "File",
  summary: "A file shipped in environment/ and copied into the image.",
  slot: "environment",
  params: [
    {
      key: "path",
      label: "Path in environment/",
      type: "string",
      default: "data/input.txt",
      required: true,
    },
    {
      key: "destination",
      label: "Copy to",
      type: "string",
      default: "/app/",
      required: true,
      description: "Absolute path in the container. A trailing / keeps the file name.",
    },
    { key: "content", label: "Content", type: "code", default: "", language: "text" },
  ],
  contributes: {
    files: [{ path: "environment/{{path}}", template: "{{content}}" }],
    dockerfile: [{ section: "files", template: "COPY {{path}} {{destination}}\n" }],
  },
}

export const runCommands: PartManifest = {
  id: "slipway/run-commands",
  version: "1.0.0",
  name: "Setup script",
  summary: "Shell commands run while building the image. Needs BuildKit, the default since Docker 23.",
  slot: "environment",
  params: [
    {
      key: "script",
      label: "Script",
      type: "code",
      language: "bash",
      default: "echo \"setting up\"",
      required: true,
    },
  ],
  contributes: {
    dockerfile: [
      {
        section: "setup",
        template: "RUN <<'EOF'\nset -euo pipefail\n{{script}}\nEOF\n",
      },
    ],
  },
}

export const environmentVariables: PartManifest = {
  id: "slipway/environment-variables",
  version: "1.0.0",
  name: "Environment variables",
  summary: "Variables set in the task environment, through [environment].env.",
  slot: "environment",
  params: [{ key: "vars", label: "Variables", type: "map", default: {}, required: true }],
  contributes: { config: { environment: { env: "{{vars}}" } } },
}

export const resources: PartManifest = {
  id: "slipway/resources",
  version: "1.0.0",
  name: "Resources",
  summary: "CPU, memory, storage and GPU limits for the container.",
  slot: "environment",
  role: "resources",
  params: [
    { key: "cpus", label: "CPUs", type: "number", default: 1 },
    { key: "memory_mb", label: "Memory (MB)", type: "number", default: 2048 },
    { key: "storage_mb", label: "Storage (MB)", type: "number" },
    { key: "gpus", label: "GPUs", type: "number" },
  ],
  contributes: {
    config: {
      environment: {
        cpus: "{{cpus}}",
        memory_mb: "{{memory_mb}}",
        storage_mb: "{{storage_mb}}",
        gpus: "{{gpus}}",
      },
    },
  },
}

export const network: PartManifest = {
  id: "slipway/network",
  version: "1.0.0",
  name: "Network policy",
  summary: "Whether the agent and verifier can reach the internet.",
  slot: "environment",
  role: "network",
  params: [
    {
      key: "mode",
      label: "Mode",
      type: "enum",
      options: ["public", "no-network", "allowlist"],
      default: "no-network",
      required: true,
    },
    {
      key: "allowed_hosts",
      label: "Allowed hosts",
      type: "list",
      default: [],
      description: "Only used with allowlist, e.g. pypi.org.",
    },
    {
      key: "verifier_online",
      label: "Verifier can reach the internet",
      type: "boolean",
      default: true,
      description:
        "Harbor applies the policy to the verifier too. Verifiers that download test tools, like pytest, score 0 offline.",
    },
  ],
  contributes: {
    config: {
      environment: { network_mode: "{{mode}}", allowed_hosts: "{{allowed_hosts}}" },
      verifier: { network_mode: "{{#if verifier_online}}public{{/if}}" },
    },
  },
}

export const mcpServer: PartManifest = {
  id: "slipway/mcp-server",
  version: "1.0.0",
  name: "MCP server",
  summary: "An MCP server the agent can use during the task.",
  slot: "environment",
  params: [
    { key: "name", label: "Name", type: "string", default: "", required: true },
    {
      key: "transport",
      label: "Transport",
      type: "enum",
      options: ["stdio", "sse", "streamable-http"],
      default: "streamable-http",
      required: true,
    },
    { key: "url", label: "URL", type: "string", default: "", description: "For sse and streamable-http." },
    { key: "command", label: "Command", type: "string", default: "", description: "For stdio." },
    { key: "args", label: "Arguments", type: "list", default: [] },
  ],
  contributes: {
    config: {
      environment: {
        mcp_servers: [
          {
            name: "{{name}}",
            transport: "{{transport}}",
            url: "{{url}}",
            command: "{{command}}",
            args: "{{args}}",
          },
        ],
      },
    },
  },
}

export const environmentParts = [
  baseImage,
  aptPackages,
  pipPackages,
  npmPackages,
  environmentFile,
  runCommands,
  environmentVariables,
  resources,
  network,
  mcpServer,
]
