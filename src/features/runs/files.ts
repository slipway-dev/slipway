import { ImportBudget, unzipWithin, type ImportLimits, type Skipped } from "@/lib/safe-files"

/**
 * A set of files from a Harbor jobs folder, keyed by forward-slash path.
 * Blobs keep large jobs out of memory until a file is actually opened.
 */
export type FileSet = Map<string, Blob>

/** Jobs carry logs and trajectories, not artifacts; big files are usually core dumps or images. */
export const JOB_LIMITS: ImportLimits = {
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 500 * 1024 * 1024,
  maxFiles: 50_000,
}

export interface ImportReport {
  files: FileSet
  skipped: Skipped[]
}

export function filesFromZip(data: Uint8Array, budget = new ImportBudget(JOB_LIMITS)): ImportReport {
  const files: FileSet = new Map()
  for (const [path, bytes] of unzipWithin(data, budget, JOB_LIMITS)) {
    files.set(path, new Blob([bytes as BlobPart]))
  }
  return { files, skipped: budget.skipped }
}

/** From <input webkitdirectory> or a dropped folder; paths start at the chosen folder. */
export function filesFromList(
  files: Iterable<[path: string, file: File]>,
  budget = new ImportBudget(JOB_LIMITS),
): ImportReport {
  const out: FileSet = new Map()
  for (const [raw, file] of files) {
    const path = budget.admit(raw, file.size)
    if (path) out.set(path, file)
  }
  return { files: out, skipped: budget.skipped }
}

export async function readText(files: FileSet, path: string): Promise<string | undefined> {
  const blob = files.get(path)
  return blob ? blob.text() : undefined
}

export async function readJson<T>(files: FileSet, path: string): Promise<T | undefined> {
  const text = await readText(files, path)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

export function dirname(path: string): string {
  const i = path.lastIndexOf("/")
  return i === -1 ? "" : path.slice(0, i)
}

export function join(...parts: string[]): string {
  return parts.filter(Boolean).join("/")
}

/** The files under `dir`, re-keyed relative to it. */
export function subset(files: FileSet, dir: string): FileSet {
  if (!dir) return new Map(files)
  const prefix = dir + "/"
  const out: FileSet = new Map()
  for (const [path, blob] of files) {
    if (path.startsWith(prefix)) out.set(path.slice(prefix.length), blob)
  }
  return out
}
