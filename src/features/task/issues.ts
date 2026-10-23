export type IssueSeverity = "error" | "warning"

export interface Issue {
  severity: IssueSeverity
  /** Stable id for the rule, e.g. "missing-reward". */
  code: string
  message: string
  /** Task file the issue is about, relative to the task root. */
  path?: string
  /** Block the issue is about. */
  blockId?: string
}
