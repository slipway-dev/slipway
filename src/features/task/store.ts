"use client"

import { del, get, set } from "idb-keyval"
import { useMemo, useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"

import { createBlock, createLookup, type PartLookup } from "@/features/parts/registry"
import type { Block, ParamValue, PartManifest, SlotId } from "@/features/parts/types"

import type { FileOverride, TaskProject } from "./model"
import { createStarter, type StarterId } from "./starters"

/** IndexedDB, not localStorage: tasks carry whole files and outgrow 5 MB. */
const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
}

interface StudioState {
  projects: Record<string, TaskProject>
  /** Parts the author made or installed; see features/parts/manifest.ts. */
  customParts: PartManifest[]

  createProject: (starter: StarterId) => string
  addProject: (project: TaskProject) => string
  deleteProject: (id: string) => void
  updateProject: (id: string, update: (draft: TaskProject) => void) => void

  addBlock: (id: string, slot: SlotId, part: PartManifest) => string
  updateBlockParam: (id: string, slot: SlotId, blockId: string, key: string, value: ParamValue | undefined) => void
  toggleBlock: (id: string, slot: SlotId, blockId: string) => void
  removeBlock: (id: string, slot: SlotId, blockId: string) => void
  moveBlock: (id: string, slot: SlotId, from: number, to: number) => void

  setOverride: (id: string, path: string, override: FileOverride) => void
  removeOverride: (id: string, path: string) => void

  saveCustomPart: (part: PartManifest) => void
  removeCustomPart: (partId: string) => void
}

function findBlock(project: TaskProject, slot: SlotId, blockId: string): Block | undefined {
  return project.blocks[slot].find((b) => b.id === blockId)
}

export const useStudio = create<StudioState>()(
  persist(
    (setState, getState) => {
      const updateProject: StudioState["updateProject"] = (id, update) =>
        setState((state) => {
          const current = state.projects[id]
          if (!current) return state
          const draft = structuredClone(current)
          update(draft)
          draft.updatedAt = new Date().toISOString()
          return { projects: { ...state.projects, [id]: draft } }
        })

      return {
        projects: {},
        customParts: [],

        createProject: (starter) => getState().addProject(createStarter(starter)),
        addProject: (project) => {
          setState((state) => ({ projects: { ...state.projects, [project.id]: project } }))
          return project.id
        },
        deleteProject: (id) =>
          setState((state) => {
            const projects = { ...state.projects }
            delete projects[id]
            return { projects }
          }),
        updateProject,

        addBlock: (id, slot, part) => {
          const block = createBlock(part)
          updateProject(id, (p) => {
            p.blocks[slot].push(block)
          })
          return block.id
        },
        updateBlockParam: (id, slot, blockId, key, value) =>
          updateProject(id, (p) => {
            const block = findBlock(p, slot, blockId)
            if (!block) return
            if (value === undefined) delete block.params[key]
            else block.params[key] = value
          }),
        toggleBlock: (id, slot, blockId) =>
          updateProject(id, (p) => {
            const block = findBlock(p, slot, blockId)
            if (block) block.disabled = !block.disabled
          }),
        removeBlock: (id, slot, blockId) =>
          updateProject(id, (p) => {
            p.blocks[slot] = p.blocks[slot].filter((b) => b.id !== blockId)
          }),
        moveBlock: (id, slot, from, to) =>
          updateProject(id, (p) => {
            const [block] = p.blocks[slot].splice(from, 1)
            if (block) p.blocks[slot].splice(to, 0, block)
          }),

        setOverride: (id, path, override) =>
          updateProject(id, (p) => {
            p.overrides[path] = override
          }),
        removeOverride: (id, path) =>
          updateProject(id, (p) => {
            delete p.overrides[path]
          }),

        saveCustomPart: (part) =>
          setState((state) => ({
            customParts: [...state.customParts.filter((p) => p.id !== part.id), part],
          })),
        removeCustomPart: (partId) =>
          setState((state) => ({
            customParts: state.customParts.filter((p) => p.id !== partId),
          })),
      }
    },
    {
      name: "slipway-studio",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ projects: state.projects, customParts: state.customParts }),
    },
  ),
)

/** False until saved tasks have loaded from IndexedDB. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStudio.persist.onFinishHydration(onChange),
    () => useStudio.persist.hasHydrated(),
    () => false,
  )
}

export function usePartLookup(): PartLookup {
  const customParts = useStudio((s) => s.customParts)
  return useMemo(() => createLookup(customParts), [customParts])
}
