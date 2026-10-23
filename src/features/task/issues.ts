export type IssueSeverity = "error" | "warning"

/**
 * Every rule compose() and lint() can report. The UI translates an issue by
 * its code and fills in `params`; `message` is the English fallback. Adding a
 * code here is a change to the translation contract.
 */
export const ISSUE_CODES = [
  // compose: params noted per code
  "unknown-part", // { partId }
  "role-conflict", // { role, part, partId, holder, holderId }
  "missing-param", // { part, partId, param, paramKey }
  "bad-path", // { part, partId, path }
  "file-conflict", // { part, partId, path }
  "template-error", // { part, partId, detail }
  // lint
  "schema", // { path, keyword, detail }
  "task-name",
  "empty-instruction",
  "no-environment",
  "dockerfile-from",
  "solution-leak",
  "tests-leak",
  "pip-without-python",
  "no-verifier",
  "missing-reward",
  "rewards-json",
  "verifier-offline",
  "shebang",
  "no-solution",
  "empty-solution",
] as const

export type IssueCode = (typeof ISSUE_CODES)[number]

export interface Issue {
  severity: IssueSeverity
  /** Stable id for the rule, and the translation key. */
  code: IssueCode
  /** English text, used when no translation exists. */
  message: string
  /** Values a translated message interpolates; see ISSUE_CODES. */
  params?: Record<string, string | number>
  /** Task file the issue is about, relative to the task root. */
  path?: string
  /** Block the issue is about. */
  blockId?: string
}
