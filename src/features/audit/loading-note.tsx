"use client"

import { useT } from "@/i18n/provider"

/** Fallback text while a job or trial loads from IndexedDB. */
export function LoadingNote({ what }: { what: "job" | "trial" }) {
  const t = useT().runs
  return <p className="text-body-sm text-ink-muted">{what === "job" ? t.loadingJob : t.loadingTrial}</p>
}
