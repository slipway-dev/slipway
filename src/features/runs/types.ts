/**
 * The files `harbor run` writes, as Slipway reads them. Shapes follow
 * harbor.models.trial.result, harbor.models.job.result and
 * harbor.models.trajectories (ATIF v1.0–1.8) in harbor 0.24. Only the
 * fields Slipway shows are typed; everything is optional because jobs
 * can be partial (still running, crashed, older Harbor versions).
 */

export interface TimingInfo {
  started_at?: string | null
  finished_at?: string | null
}

export interface ExceptionInfo {
  exception_type: string
  exception_message: string
  exception_traceback?: string
  occurred_at?: string
}

export interface TrialResult {
  id?: string
  task_name?: string
  trial_name?: string
  config?: { agent?: { name?: string; model_name?: string | null } }
  agent_info?: {
    name?: string
    version?: string
    model_info?: { name?: string; provider?: string | null } | null
  }
  agent_result?: {
    n_input_tokens?: number | null
    n_cache_tokens?: number | null
    n_output_tokens?: number | null
    cost_usd?: number | null
  } | null
  verifier_result?: { rewards?: Record<string, number> | null } | null
  exception_info?: ExceptionInfo | null
  started_at?: string | null
  finished_at?: string | null
  environment_setup?: TimingInfo | null
  agent_setup?: TimingInfo | null
  agent_execution?: TimingInfo | null
  verifier?: TimingInfo | null
  step_results?: { step_name: string; verifier_result?: TrialResult["verifier_result"] }[] | null
}

export interface JobResult {
  id?: string
  started_at?: string | null
  finished_at?: string | null
  n_total_trials?: number
  stats?: {
    n_completed_trials?: number
    n_errored_trials?: number
    n_input_tokens?: number | null
    n_output_tokens?: number | null
    cost_usd?: number | null
  }
}

/* ATIF */

export interface ContentPart {
  type: "text" | "image" | "audio"
  text?: string | null
  source?: { media_type: string; path: string } | null
}

export type Content = string | ContentPart[]

export interface ToolCall {
  tool_call_id: string
  function_name: string
  arguments: Record<string, unknown>
}

export interface SubagentTrajectoryRef {
  trajectory_id?: string | null
  trajectory_path?: string | null
  session_id?: string | null
}

export interface ObservationResult {
  source_call_id?: string | null
  content?: Content | null
  subagent_trajectory_ref?: SubagentTrajectoryRef[] | null
}

export interface StepMetrics {
  prompt_tokens?: number | null
  completion_tokens?: number | null
  cached_tokens?: number | null
  cost_usd?: number | null
}

export interface Step {
  step_id: number
  timestamp?: string | null
  source: "system" | "user" | "agent"
  model_name?: string | null
  reasoning_effort?: string | number | null
  message: Content
  reasoning_content?: string | null
  tool_calls?: ToolCall[] | null
  observation?: { results: ObservationResult[] } | null
  metrics?: StepMetrics | null
  is_copied_context?: boolean | null
  llm_call_count?: number | null
}

export interface Trajectory {
  schema_version?: string
  session_id?: string | null
  trajectory_id?: string | null
  agent: { name: string; version?: string; model_name?: string | null }
  steps: Step[]
  notes?: string | null
  final_metrics?: {
    total_prompt_tokens?: number | null
    total_completion_tokens?: number | null
    total_cached_tokens?: number | null
    total_cost_usd?: number | null
    total_steps?: number | null
  } | null
  continued_trajectory_ref?: string | null
  subagent_trajectories?: Trajectory[] | null
}

/* CTRF (pytest-json-ctrf), written by Harbor's pytest verifier template */

export interface CtrfTest {
  name: string
  status: "passed" | "failed" | "skipped" | "pending" | "other"
  duration?: number
  message?: string
  trace?: string
}
