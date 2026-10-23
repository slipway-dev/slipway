"use client"

import { createStore, del, get, set, type UseStore } from "idb-keyval"
import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { idbStorage } from "@/lib/idb-storage"

import { discoverJobs } from "./discover"
import type { FileSet, ImportReport } from "./files"
import { indexJob, type JobIndex } from "./job"

export interface JobMeta {
  id: string
  name: string
  importedAt: string
  trialCount: number
  agents: string[]
  passCount: number
}

/** A reviewer's call on a step or a whole trial. */
export type Verdict = "ok" | "issue" | "hack"

export interface Annotation {
  verdict?: Verdict
  note: string
  updatedAt: string
}

export function annotationKey(jobId: string, trial: string, trajectory: string, stepId: number | "trial") {
  return [jobId, trial, trajectory || "root", stepId].join("::")
}

interface RunsState {
  jobs: Record<string, JobMeta>
  annotations: Record<string, Annotation>
  addJob: (meta: JobMeta) => void
  removeJob: (id: string) => void
  setAnnotation: (key: string, annotation: Omit<Annotation, "updatedAt"> | null) => void
}

export const useRuns = create<RunsState>()(
  persist(
    (setState) => ({
      jobs: {},
      annotations: {},
      addJob: (meta) => setState((s) => ({ jobs: { ...s.jobs, [meta.id]: meta } })),
      removeJob: (id) =>
        setState((s) => {
          const jobs = { ...s.jobs }
          delete jobs[id]
          const annotations = Object.fromEntries(
            Object.entries(s.annotations).filter(([key]) => !key.startsWith(`${id}::`)),
          )
          return { jobs, annotations }
        }),
      setAnnotation: (key, annotation) =>
        setState((s) => {
          const annotations = { ...s.annotations }
          if (!annotation || (!annotation.verdict && !annotation.note.trim())) delete annotations[key]
          else annotations[key] = { ...annotation, updatedAt: new Date().toISOString() }
          return { annotations }
        }),
    }),
    {
      name: "slipway-runs",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ jobs: s.jobs, annotations: s.annotations }),
    },
  ),
)

export function useRunsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useRuns.persist.onFinishHydration(onChange),
    () => useRuns.persist.hasHydrated(),
    () => false,
  )
}

/* Job files live in their own IndexedDB store as Blobs, apart from the small index above. */

let fileStore: UseStore | undefined
function files(): UseStore {
  fileStore ??= createStore("slipway-run-files", "jobs")
  return fileStore
}

export interface LoadedJob {
  id: string
  files: FileSet
  index: JobIndex
}

const loading = new Map<string, Promise<LoadedJob | undefined>>()

/** Load a job's files and index once per session; pages share the promise. */
export function loadJob(id: string): Promise<LoadedJob | undefined> {
  let promise = loading.get(id)
  if (!promise) {
    promise = get<Record<string, Blob>>(id, files()).then(async (stored) => {
      if (!stored) return undefined
      const fileSet: FileSet = new Map(Object.entries(stored))
      return { id, files: fileSet, index: await indexJob(fileSet) }
    })
    loading.set(id, promise)
  }
  return promise
}

/** Find jobs in imported files, save them, and return their ids. */
export async function importJobs(report: ImportReport): Promise<string[]> {
  const jobs = await discoverJobs(report.files)
  for (const job of jobs) {
    const index = await indexJob(job.files)
    await set(job.id, Object.fromEntries(job.files), files())
    loading.set(job.id, Promise.resolve({ id: job.id, files: job.files, index }))
    useRuns.getState().addJob({
      id: job.id,
      name: job.name,
      importedAt: new Date().toISOString(),
      trialCount: index.trials.length,
      agents: [...new Set(index.trials.map((t) => (t.model ? `${t.agent} · ${t.model}` : t.agent)))],
      passCount: index.trials.filter((t) => t.status === "pass").length,
    })
  }
  return jobs.map((j) => j.id)
}

export async function deleteJob(id: string): Promise<void> {
  loading.delete(id)
  await del(id, files())
  useRuns.getState().removeJob(id)
}
