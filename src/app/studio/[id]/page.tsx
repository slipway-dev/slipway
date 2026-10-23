import type { Metadata } from "next"
import { Suspense } from "react"

import { Studio } from "@/features/studio/studio"

export const metadata: Metadata = { title: "Studio — Slipway" }

/** Tasks live in the browser (IndexedDB), so the server only renders the shell. */
export default function StudioPage({ params }: PageProps<"/studio/[id]">) {
  return (
    <Suspense fallback={<p className="p-4 text-body-sm text-ink-muted">Loading task…</p>}>
      {params.then(({ id }) => (
        <Studio id={id} />
      ))}
    </Suspense>
  )
}
