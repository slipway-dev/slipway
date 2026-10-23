import { unzipSync } from "fflate"

/**
 * A set of files from a Harbor jobs folder, keyed by forward-slash path.
 * Blobs keep large jobs out of memory until a file is actually opened.
 */
export type FileSet = Map<string, Blob>

/** Files larger than this are skipped on import (artifacts, core dumps). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024

const IGNORED = /(^|\/)(__MACOSX|\.DS_Store|\._[^/]*)(\/|$)/

export interface ImportReport {
  files: FileSet
  skipped: string[]
}

function accept(path: string, size: number, report: ImportReport, blob: () => Blob) {
  if (!path || path.endsWith("/") || IGNORED.test(path)) return
  if (size > MAX_FILE_BYTES) {
    report.skipped.push(path)
    return
  }
  report.files.set(path, blob())
}

export function filesFromZip(data: Uint8Array): ImportReport {
  const report: ImportReport = { files: new Map(), skipped: [] }
  const entries = unzipSync(data)
  for (const [path, bytes] of Object.entries(entries)) {
    accept(path, bytes.byteLength, report, () => new Blob([bytes as BlobPart]))
  }
  return report
}

/** From <input webkitdirectory> or a dropped folder; paths start at the chosen folder. */
export function filesFromList(files: Iterable<[path: string, file: File]>): ImportReport {
  const report: ImportReport = { files: new Map(), skipped: [] }
  for (const [path, file] of files) {
    accept(path.replace(/\\/g, "/"), file.size, report, () => file)
  }
  return report
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
