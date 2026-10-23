import { importTaskFiles, TASK_LIMITS, type TaskImport } from "@/features/task/archive"
import { isZip, type PathedFile } from "@/lib/local-files"
import { ImportBudget, toMB, unzipWithin } from "@/lib/safe-files"

/**
 * Read picked or dropped task folders and zips, in the browser, within
 * TASK_LIMITS. Files are admitted by size before they are read, so an
 * oversized file is never loaded into memory.
 */
export async function readTasks(files: PathedFile[]): Promise<TaskImport> {
  const budget = new ImportBudget(TASK_LIMITS)
  const bytes = new Map<string, Uint8Array>()
  for (const [path, file] of files) {
    if (isZip(file)) {
      if (file.size > TASK_LIMITS.maxTotalBytes) {
        budget.skipped.push({
          path,
          code: "zip-too-large",
          params: { limitMB: toMB(TASK_LIMITS.maxTotalBytes) },
          reason: "zip larger than the import limit",
        })
        continue
      }
      unzipWithin(new Uint8Array(await file.arrayBuffer()), budget, TASK_LIMITS).forEach((data, p) =>
        bytes.set(p, data),
      )
      continue
    }
    const safe = budget.admit(path, file.size)
    if (safe) bytes.set(safe, new Uint8Array(await file.arrayBuffer()))
  }
  return importTaskFiles(bytes, budget.skipped)
}
