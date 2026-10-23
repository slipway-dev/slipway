import { strToU8, zipSync, type Zippable } from "fflate"

import { TASK_PATHS } from "@/features/harbor/constants"
import { parseTaskConfig } from "@/features/harbor/toml"
import {
  decodeText,
  fromBase64,
  ImportBudget,
  toBase64,
  unzipWithin,
  type ImportLimits,
  type Skipped,
} from "@/lib/safe-files"

import { MANAGED_PATHS, type TaskFile } from "./compose"
import type { FileOverride, TaskProject } from "./model"
import { emptyProject } from "./starters"

/** Unix file type and mode in the high 16 bits of a zip entry's external attributes. */
const MODE_FILE = 0o100644
const MODE_EXEC = 0o100755

/**
 * Tasks are saved whole in IndexedDB and re-serialized on every edit, so
 * they stay small. Large data belongs in the image build, not the task.
 */
export const TASK_LIMITS: ImportLimits = {
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
  maxFiles: 5_000,
}

/**
 * Launch: pack the task as `<dir>/...` so unzipping gives a folder that
 * `harbor run -p ./<dir>` takes as-is. Scripts keep their executable bit.
 */
export function buildTaskZip(dir: string, files: TaskFile[]): Uint8Array {
  const entries: Zippable = {}
  for (const file of files) {
    const mode = file.executable ? MODE_EXEC : MODE_FILE
    entries[`${dir}/${file.path}`] = [
      file.encoding === "base64" ? fromBase64(file.content) : strToU8(file.content),
      { os: 3, attrs: (mode << 16) >>> 0, mtime: new Date("2026-01-01T00:00:00Z") },
    ]
  }
  return zipSync(entries, { level: 6 })
}

export interface TaskImport {
  projects: TaskProject[]
  skipped: Skipped[]
}

/** Folders holding a task.toml, deepest first so nested tasks claim their own files. */
function taskRoots(paths: string[]): string[] {
  return paths
    .filter((p) => p === TASK_PATHS.config || p.endsWith(`/${TASK_PATHS.config}`))
    .map((p) => p.slice(0, -TASK_PATHS.config.length))
    .sort((a, b) => b.length - a.length)
}

/**
 * Import Harbor tasks from files already read within a budget (see
 * lib/safe-files). A folder holding several tasks, like a dataset, yields
 * one project per task.toml. Everything but task.toml and instruction.md
 * becomes a file override, binary files included, so nothing is lost.
 */
export function importTaskFiles(files: Map<string, Uint8Array>, skipped: Skipped[] = []): TaskImport {
  const roots = taskRoots([...files.keys()])
  if (roots.length === 0) {
    throw new Error("No task.toml found. Choose a Harbor task folder, a folder of tasks, or a zip of one.")
  }

  const byRoot = new Map<string, [string, Uint8Array][]>(roots.map((r) => [r, []]))
  for (const [path, bytes] of files) {
    const root = roots.find((r) => path.startsWith(r))
    if (root !== undefined) byRoot.get(root)!.push([path.slice(root.length), bytes])
  }

  const projects: TaskProject[] = []
  for (const root of [...roots].sort()) {
    const label = root || TASK_PATHS.config
    const project = emptyProject()
    const overrides: Record<string, FileOverride> = {}
    try {
      for (const [path, bytes] of byRoot.get(root)!) {
        const text = decodeText(bytes)
        if (path === TASK_PATHS.config || path === TASK_PATHS.instruction) {
          if (text === undefined) throw new Error(`${path} is not UTF-8 text`)
          if (path === TASK_PATHS.config) project.config = parseTaskConfig(text)
          else project.instruction = text
        } else if (!MANAGED_PATHS.includes(path)) {
          overrides[path] =
            text === undefined
              ? { content: toBase64(bytes), encoding: "base64" }
              : { content: text, executable: path.endsWith(".sh") }
        }
      }
    } catch (error) {
      skipped.push({ path: label, reason: `not imported: ${(error as Error).message}` })
      continue
    }
    delete project.config.schema_version
    project.overrides = overrides
    projects.push(project)
  }
  return { projects, skipped }
}

export function importTaskZip(data: Uint8Array): TaskImport {
  const budget = new ImportBudget(TASK_LIMITS)
  return importTaskFiles(unzipWithin(data, budget, TASK_LIMITS), budget.skipped)
}
