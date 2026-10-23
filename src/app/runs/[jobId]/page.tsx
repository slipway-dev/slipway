import type { Metadata } from "next"
import { Suspense } from "react"

import { ClientOnly } from "@/components/client-only"
import { SiteNav } from "@/components/site-nav"
import { JobView } from "@/features/audit/job-view"

export const metadata: Metadata = { title: "Job — Slipway" }

const loading = <p className="text-body-sm text-ink-muted">Loading job…</p>

/** Imported jobs live in the browser (IndexedDB), so the server only renders the shell. */
export default function JobPage({ params }: PageProps<"/runs/[jobId]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/runs" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
        <Suspense fallback={loading}>
          {params.then(({ jobId }) => (
            <ClientOnly fallback={loading}>
              <JobView id={jobId} />
            </ClientOnly>
          ))}
        </Suspense>
      </main>
    </div>
  )
}
