export function formatDuration(sec: number | undefined): string {
  if (sec === undefined) return "—"
  if (sec < 1) return `${Math.round(sec * 1000)} ms`
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)} s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, "0")}m`
}

export function formatTokens(n: number | undefined | null): string {
  if (n == null) return "—"
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function formatCost(usd: number | undefined | null): string {
  if (usd == null) return "—"
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

export function formatReward(value: number | undefined): string {
  if (value === undefined) return "—"
  return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(3).replace(/0+$/, "")
}

/** "+1:05" relative to a start time, for step timestamps. */
export function formatOffset(timestamp: string | null | undefined, start: number | undefined): string | undefined {
  if (!timestamp || start === undefined) return undefined
  const t = Date.parse(timestamp)
  if (!Number.isFinite(t)) return undefined
  const sec = Math.max(0, Math.round((t - start) / 1000))
  return `+${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`
}
