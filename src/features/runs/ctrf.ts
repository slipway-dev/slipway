import type { CtrfTest } from "./types"

export interface CtrfReport {
  tool?: string
  tests: CtrfTest[]
}

/** Parse verifier/ctrf.json (Common Test Report Format), written by Harbor's pytest template. */
export function parseCtrf(value: unknown): CtrfReport | undefined {
  const results = (value as { results?: { tool?: { name?: string }; tests?: unknown } })?.results
  if (!results || !Array.isArray(results.tests)) return undefined
  return {
    tool: results.tool?.name,
    tests: results.tests.filter(
      (t): t is CtrfTest => typeof t === "object" && t !== null && typeof (t as CtrfTest).name === "string",
    ),
  }
}
