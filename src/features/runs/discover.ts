import { dirname, readJson, subset, type FileSet } from "./files"

export interface DiscoveredJob {
  /** JobResult.id when present, so re-importing a job replaces it. */
  id: string
  name: string
  /** Files relative to the job folder: `<trial>/result.json`, `result.json`, ... */
  files: FileSet
}

type Kind = "trial" | "job" | undefined

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

/** Trial and job folders both hold result.json and config.json; their contents tell them apart. */
async function classify(files: FileSet, dir: string): Promise<Kind> {
  const prefix = dir ? dir + "/" : ""
  const result = await readJson<Record<string, unknown>>(files, prefix + "result.json")
  if (result) {
    if ("trial_name" in result) return "trial"
    if ("n_total_trials" in result || "stats" in result) return "job"
  }
  const config = await readJson<Record<string, unknown>>(files, prefix + "config.json")
  if (config) {
    if ("trial_name" in config) return "trial"
    if ("jobs_dir" in config || "tasks" in config || "datasets" in config) return "job"
  }
  return undefined
}

function looksLikeTrajectory(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { steps?: unknown }).steps) &&
    typeof (value as { agent?: unknown }).agent === "object"
  )
}

/**
 * Find Harbor jobs in an imported folder or zip. Accepts a jobs folder
 * holding several jobs, one job folder, one trial folder, or a lone ATIF
 * trajectory file.
 */
export async function discoverJobs(files: FileSet): Promise<DiscoveredJob[]> {
  const dirs = new Set<string>()
  for (const path of files.keys()) {
    const name = basename(path)
    if (name === "result.json" || name === "config.json") dirs.add(dirname(path))
  }

  const trialDirs: string[] = []
  const jobDirs = new Set<string>()
  for (const dir of dirs) {
    const kind = await classify(files, dir)
    if (kind === "trial") trialDirs.push(dir)
    else if (kind === "job") jobDirs.add(dir)
  }

  const jobs: DiscoveredJob[] = []
  const byParent = new Map<string, string[]>()
  for (const dir of trialDirs) {
    if (dir === "") {
      // The chosen folder is a trial itself: wrap it in a job.
      const name = (await readJson<{ trial_name?: string }>(files, "result.json"))?.trial_name ?? "trial"
      const wrapped: FileSet = new Map()
      for (const [path, blob] of files) wrapped.set(`${name}/${path}`, blob)
      jobs.push({ id: crypto.randomUUID(), name, files: wrapped })
      continue
    }
    const parent = dirname(dir)
    byParent.set(parent, [...(byParent.get(parent) ?? []), dir])
    jobDirs.add(parent)
  }

  for (const dir of jobDirs) {
    const jobFiles = subset(files, dir)
    const result = await readJson<{ id?: string }>(jobFiles, "result.json")
    jobs.push({
      id: result?.id ?? crypto.randomUUID(),
      name: dir ? basename(dir) : "Imported job",
      files: jobFiles,
    })
  }

  if (jobs.length === 0) {
    for (const [path, blob] of files) {
      if (!path.endsWith(".json")) continue
      const parsed = await readJson<unknown>(files, path)
      if (!looksLikeTrajectory(parsed)) continue
      const name = basename(path).replace(/\.json$/, "")
      jobs.push({
        id: crypto.randomUUID(),
        name: basename(path),
        files: new Map([[`${name}/agent/trajectory.json`, blob]]),
      })
    }
  }

  return jobs.sort((a, b) => a.name.localeCompare(b.name))
}
