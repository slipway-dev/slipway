import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate"

import { TASK_PATHS } from "@/features/harbor/constants"
import { parseTaskConfig } from "@/features/harbor/toml"

import { MANAGED_PATHS, type TaskFile } from "./compose"
import type { FileOverride, TaskProject } from "./model"
import { emptyProject } from "./starters"

/** Unix file type and mode in the high 16 bits of a zip entry's external attributes. */
const MODE_FILE = 0o100644
const MODE_EXEC = 0o100755

/**
 * Launch: pack the task as `<dir>/...` so unzipping gives a folder that
 * `harbor run -p ./<dir>` takes as-is. Scripts keep their executable bit.
 */
export function buildTaskZip(dir: string, files: TaskFile[]): Uint8Array {
  const entries: Zippable = {}
  for (const file of files) {
    const mode = file.executable ? MODE_EXEC : MODE_FILE
    entries[`${dir}/${file.path}`] = [
      strToU8(file.content),
      { os: 3, attrs: (mode << 16) >>> 0, mtime: new Date("2026-01-01T00:00:00Z") },
    ]
  }
  return zipSync(entries, { level: 6 })
}

/** The task root inside an archive: the shallowest folder holding task.toml. */
function findRoot(paths: string[]): string | undefined {
  const roots = paths
    .filter((p) => p === TASK_PATHS.config || p.endsWith(`/${TASK_PATHS.config}`))
    .map((p) => p.slice(0, -TASK_PATHS.config.length))
    .sort((a, b) => a.split("/").length - b.split("/").length)
  return roots[0]
}

/**
 * Import an existing Harbor task from a .zip. Everything except task.toml and
 * instruction.md becomes a hand-written file, so nothing is lost; the author
 * can swap files for parts later.
 */
export function importTaskZip(data: Uint8Array): TaskProject {
  const entries = unzipSync(data)
  const paths = Object.keys(entries).filter((p) => !p.endsWith("/") && !p.includes("__MACOSX/"))
  const root = findRoot(paths)
  if (root === undefined) {
    throw new Error("No task.toml found in the archive. Is this a Harbor task?")
  }

  const project = emptyProject()
  const overrides: Record<string, FileOverride> = {}
  for (const fullPath of paths) {
    if (!fullPath.startsWith(root)) continue
    const path = fullPath.slice(root.length)
    if (!path || path.split("/").some((seg) => seg === ".." || seg === ".DS_Store")) continue
    const text = strFromU8(entries[fullPath])
    if (path === TASK_PATHS.config) project.config = parseTaskConfig(text)
    else if (path === TASK_PATHS.instruction) project.instruction = text
    else if (!MANAGED_PATHS.includes(path)) {
      overrides[path] = { content: text, executable: path.endsWith(".sh") }
    }
  }
  delete project.config.schema_version
  project.overrides = overrides
  return project
}
