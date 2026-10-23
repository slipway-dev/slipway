/**
 * Reading what a user picks or drops, in the browser. Nothing here sends a
 * byte anywhere; callers keep the files in memory or IndexedDB.
 */

import { formatMB, type Skipped } from "./safe-files"

export type PathedFile = [path: string, file: File]

/** Walk a dropped folder; File objects from entries carry no relative path, so track it here. */
async function readEntry(entry: FileSystemEntry, prefix: string, out: PathedFile[]): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isFile) {
    out.push([path, await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))])
    return
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  // readEntries returns at most ~100 entries per call.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (batch.length === 0) break
    await Promise.all(batch.map((child) => readEntry(child, path, out)))
  }
}

/** Files and folders dropped on the page, with paths relative to what was dropped. */
export async function filesFromDrop(transfer: DataTransfer): Promise<PathedFile[]> {
  const entries = [...transfer.items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry))
  const out: PathedFile[] = []
  await Promise.all(entries.map((entry) => readEntry(entry, "", out)))
  return out
}

/** Files from <input type="file">, with folder-relative paths when it has webkitdirectory. */
export function filesFromInput(files: FileList | null): PathedFile[] {
  return [...(files ?? [])].map((file) => [file.webkitRelativePath || file.name, file])
}

export function isZip(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip")
}

/** One line for a toast: "Skipped 3 files: 2 larger than 25 MB, 1 unsafe path." */
export function describeSkipped(skipped: Skipped[]): string | undefined {
  if (skipped.length === 0) return undefined
  const byReason = new Map<string, number>()
  for (const s of skipped) byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1)
  const parts = [...byReason].map(([reason, n]) => `${n} ${reason}`)
  return `Skipped ${skipped.length} ${skipped.length === 1 ? "file" : "files"}: ${parts.join(", ")}.`
}

export { formatMB }
