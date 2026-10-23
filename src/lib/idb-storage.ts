import { del, get, set } from "idb-keyval"
import type { StateStorage } from "zustand/middleware"

/** Zustand persistence in IndexedDB, not localStorage: state can outgrow 5 MB. */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
}
