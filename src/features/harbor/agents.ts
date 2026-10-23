/**
 * The agents `harbor run -a <name>` accepts, and how to build that command.
 * Names come from harbor/models/agent/name.py (AgentName) and provider keys
 * from harbor/agents/model_connection.py (PROVIDERS), Harbor 0.24.0. A task
 * never names its agent; the agent is chosen when the task is run.
 */

export type AgentGroup = "reference" | "harness" | "cli"

export interface AgentInfo {
  name: string
  label: string
  group: AgentGroup
  /** Whether the agent talks to a model, so `-m provider/model` applies. */
  usesModel: boolean
  /** A model it is commonly run with, as a placeholder. */
  model?: string
  /** Keys the agent reads itself, beyond the model provider's key. */
  env?: string[]
}

export const AGENTS: readonly AgentInfo[] = [
  { name: "oracle", label: "Oracle", group: "reference", usesModel: false },
  { name: "nop", label: "Nop", group: "reference", usesModel: false },

  { name: "terminus-2", label: "Terminus 2", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "openhands", label: "OpenHands", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "openhands-sdk", label: "OpenHands SDK", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "mini-swe-agent", label: "mini-SWE-agent", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "swe-agent", label: "SWE-agent", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "trae-agent", label: "Trae Agent", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "langgraph", label: "LangGraph", group: "harness", usesModel: true, model: "openai/gpt-5" },
  { name: "deerflow", label: "DeerFlow", group: "harness", usesModel: true, model: "openai/gpt-5" },
  { name: "strands", label: "Strands", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "dspy-rlm", label: "DSPy RLM", group: "harness", usesModel: true, model: "openai/gpt-5" },
  { name: "nemo-agent", label: "NeMo Agent", group: "harness", usesModel: true, model: "nvidia/nemotron" },
  { name: "computer-1", label: "Computer 1", group: "harness", usesModel: true, model: "anthropic/claude-sonnet-4-5" },

  { name: "pi", label: "Pi", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "opencode", label: "opencode", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "claude-code", label: "Claude Code", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "codex", label: "Codex CLI", group: "cli", usesModel: true, model: "openai/gpt-5-codex" },
  { name: "gemini-cli", label: "Gemini CLI", group: "cli", usesModel: true, model: "google/gemini-2.5-pro" },
  { name: "aider", label: "Aider", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "goose", label: "Goose", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "cline-cli", label: "Cline CLI", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "cursor-cli", label: "Cursor CLI", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5", env: ["CURSOR_API_KEY"] },
  { name: "copilot-cli", label: "Copilot CLI", group: "cli", usesModel: true, model: "github-copilot/gpt-5", env: ["GITHUB_TOKEN"] },
  { name: "qwen-coder", label: "Qwen Code", group: "cli", usesModel: true, model: "dashscope/qwen3-coder-plus" },
  { name: "kimi-cli", label: "Kimi CLI", group: "cli", usesModel: true, model: "moonshot/kimi-k2" },
  { name: "kimi-code", label: "Kimi Code", group: "cli", usesModel: true, model: "moonshot/kimi-k2" },
  { name: "grok-build", label: "Grok Build", group: "cli", usesModel: true, model: "xai/grok-4" },
  { name: "hermes", label: "Hermes", group: "cli", usesModel: true, model: "openrouter/nousresearch/hermes-4-405b" },
  { name: "junie", label: "Junie", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "openclaw", label: "OpenClaw", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "code-puppy", label: "Code Puppy", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "cortex-code", label: "Cortex Code", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "rovodev-cli", label: "Rovo Dev CLI", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "antigravity-cli", label: "Antigravity CLI", group: "cli", usesModel: true, model: "google/gemini-2.5-pro" },
  { name: "devin", label: "Devin", group: "cli", usesModel: false, env: ["DEVIN_API_KEY"] },
  { name: "mimo", label: "MiMo", group: "cli", usesModel: true, model: "openai/gpt-5" },
  { name: "mcode", label: "mcode", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "muse-code", label: "Muse Code", group: "cli", usesModel: true, model: "anthropic/claude-sonnet-4-5" },
  { name: "vibe", label: "Mistral Vibe", group: "cli", usesModel: true, model: "mistral/devstral-medium" },
]

export const DEFAULT_AGENT = "terminus-2"

export function agentInfo(name: string): AgentInfo | undefined {
  return AGENTS.find((a) => a.name === name)
}

/** The API key environment variable each common provider prefix reads. */
const PROVIDER_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  "openai-responses": "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
  together: "TOGETHER_API_KEY",
  fireworks_ai: "FIREWORKS_AI_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  kimi: "KIMI_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  xai: "XAI_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  "github-copilot": "GITHUB_TOKEN",
  opencode: "OPENCODE_API_KEY",
  huggingface: "HF_TOKEN",
  "amazon-bedrock": "AWS_ACCESS_KEY_ID",
  azure: "AZURE_API_KEY",
}

/** The keys a run needs exported, in order: the model provider's, then the agent's own. */
export function requiredKeys(agent: string, model: string | undefined): string[] {
  const info = agentInfo(agent)
  const keys: string[] = []
  const provider = model?.includes("/") ? model.split("/")[0] : undefined
  if (info?.usesModel !== false && provider && PROVIDER_KEYS[provider]) keys.push(PROVIDER_KEYS[provider])
  for (const key of info?.env ?? []) if (!keys.includes(key)) keys.push(key)
  return keys
}

export interface RunOptions {
  /** The task folder, relative to where `harbor` is run. */
  dir: string
  agent: string
  model?: string
  /** `-k`: how many times each trial runs. */
  attempts?: number
  /** `--force-build`: build environment/Dockerfile even when the task names a prebuilt image. */
  forceBuild?: boolean
}

/** Shell quoting for the few values a user types (model names are usually safe). */
function quote(value: string): string {
  return /^[\w./:@+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`
}

export function runCommand({ dir, agent, model, attempts, forceBuild }: RunOptions): string {
  const parts = ["harbor run", "-p", quote(`./${dir}`), "-a", quote(agent)]
  const info = agentInfo(agent)
  if (model?.trim() && info?.usesModel !== false) parts.push("-m", quote(model.trim()))
  if (attempts && attempts > 1) parts.push("-k", String(Math.floor(attempts)))
  if (forceBuild) parts.push("--force-build")
  return parts.join(" ")
}
