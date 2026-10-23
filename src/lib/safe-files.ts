import { unzipSync } from "fflate"

/**
 * Everything a user imports — a task folder, a jobs folder, a zip — is
 * untrusted input. It is read in the browser only and never uploaded; this
 * module keeps a hostile or accidental import from exhausting memory or
 * smuggling paths that would escape a folder when Slipway writes it back out.
 */

export interface ImportLimits {
  /** Largest single file kept. */
  maxFileBytes: number
  /** Largest total kept across the import. */
  maxTotalBytes: number
  /** Most files kept. */
  maxFiles: number
}

/** Why a file was left out of an import; the UI translates by code. */
export const SKIP_CODES = [
  "unsafe-path",
  "too-large", // { limitMB }
  "too-many-files", // { limit }
  "over-total", // { limitMB }
  "size-mismatch",
  "zip-too-large", // { limitMB }
  "task-not-imported", // { detail }
] as const

export type SkipCode = (typeof SKIP_CODES)[number]

export interface Skipped {
  path: string
  code: SkipCode
  params?: Record<string, string | number>
  /** English text, used when no translation exists. */
  reason: string
}

/** Folders that are never part of a task or job: VCS, dependency caches, OS junk. */
const IGNORED_SEGMENT = /^(\.git|\.hg|\.svn|node_modules|__pycache__|\.venv|__MACOSX|\.DS_Store|Thumbs\.db|\._.*)$/

/**
 * Normalize a path from an archive or folder picker to a safe relative
 * path, or return undefined if it is unsafe: absolute, drive-qualified,
 * containing `..` or control characters.
 */
export function safeRelativePath(raw: string): string | undefined {
  if (!raw || /[\u0000-\u001f]/.test(raw)) return undefined
  const path = raw.replace(/\\/g, "/")
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return undefined
  const segments = path.split("/").filter((s) => s !== "" && s !== ".")
  if (segments.length === 0 || segments.some((s) => s === "..")) return undefined
  return segments.join("/")
}

export function isIgnoredPath(path: string): boolean {
  return path.split("/").some((segment) => IGNORED_SEGMENT.test(segment))
}

const MB = 1024 * 1024
export const toMB = (bytes: number) => Math.round((bytes / MB) * 10) / 10
export const formatMB = (bytes: number) => `${toMB(bytes)} MB`

/** Admits files one at a time against the limits and records why others were dropped. */
export class ImportBudget {
  private total = 0
  private count = 0
  readonly skipped: Skipped[] = []

  constructor(private readonly limits: ImportLimits) {}

  /** The safe path to keep the file under, or undefined if it was skipped. */
  admit(rawPath: string, size: number): string | undefined {
    if (rawPath.endsWith("/")) return undefined
    const path = safeRelativePath(rawPath)
    if (!path) {
      this.skipped.push({ path: rawPath, code: "unsafe-path", reason: "unsafe path" })
      return undefined
    }
    if (isIgnoredPath(path)) return undefined
    if (size > this.limits.maxFileBytes) {
      this.skipped.push({
        path,
        code: "too-large",
        params: { limitMB: toMB(this.limits.maxFileBytes) },
        reason: `larger than ${formatMB(this.limits.maxFileBytes)}`,
      })
      return undefined
    }
    if (this.count >= this.limits.maxFiles) {
      this.skipped.push({
        path,
        code: "too-many-files",
        params: { limit: this.limits.maxFiles },
        reason: `more than ${this.limits.maxFiles} files`,
      })
      return undefined
    }
    if (this.total + size > this.limits.maxTotalBytes) {
      this.skipped.push({
        path,
        code: "over-total",
        params: { limitMB: toMB(this.limits.maxTotalBytes) },
        reason: `import over ${formatMB(this.limits.maxTotalBytes)}`,
      })
      return undefined
    }
    this.total += size
    this.count += 1
    return path
  }
}

/**
 * Unzip within a budget. Entries are filtered on their declared size before
 * inflating, so a zip bomb is refused rather than expanded; actual sizes
 * are checked again afterwards in case the declared ones lied.
 */
export function unzipWithin(
  data: Uint8Array,
  budget: ImportBudget,
  limits: ImportLimits,
): Map<string, Uint8Array> {
  const admitted = new Map<string, string>()
  const entries = unzipSync(data, {
    filter: (file) => {
      const path = budget.admit(file.name, file.originalSize)
      if (path) admitted.set(file.name, path)
      return path !== undefined
    },
  })
  const out = new Map<string, Uint8Array>()
  for (const [name, bytes] of Object.entries(entries)) {
    const path = admitted.get(name)
    if (!path) continue
    if (bytes.byteLength > limits.maxFileBytes) {
      budget.skipped.push({ path, code: "size-mismatch", reason: "size did not match the archive's header" })
      continue
    }
    out.set(path, bytes)
  }
  return out
}

/** UTF-8 text without NUL bytes is text; anything else is kept as bytes. */
export function decodeText(bytes: Uint8Array): string | undefined {
  if (bytes.includes(0)) return undefined
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return undefined
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
