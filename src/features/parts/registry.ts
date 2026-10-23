import { environmentParts } from "./builtin/environment"
import { solutionParts } from "./builtin/solution"
import { verifierParts } from "./builtin/verifier"
import type { Block, ParamValue, PartManifest, SlotId } from "./types"

export const BUILTIN_PARTS: readonly PartManifest[] = [
  ...environmentParts,
  ...verifierParts,
  ...solutionParts,
]

export type PartLookup = (id: string) => PartManifest | undefined

/** Custom parts shadow built-ins with the same id. */
export function createLookup(custom: readonly PartManifest[] = []): PartLookup {
  const byId = new Map<string, PartManifest>()
  for (const part of BUILTIN_PARTS) byId.set(part.id, part)
  for (const part of custom) byId.set(part.id, part)
  return (id) => byId.get(id)
}

export function partsForSlot(
  slot: SlotId,
  custom: readonly PartManifest[] = [],
): PartManifest[] {
  const lookup = createLookup(custom)
  const ids = new Set([...BUILTIN_PARTS, ...custom].map((p) => p.id))
  return [...ids].map((id) => lookup(id)!).filter((p) => p.slot === slot)
}

export function defaultParams(part: PartManifest): Record<string, ParamValue> {
  const params: Record<string, ParamValue> = {}
  for (const spec of part.params) {
    if (spec.default !== undefined) params[spec.key] = structuredClone(spec.default)
  }
  return params
}

export function newBlockId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function createBlock(
  part: PartManifest,
  params: Record<string, ParamValue> = {},
): Block {
  return { id: newBlockId(), partId: part.id, params: { ...defaultParams(part), ...params } }
}
