import type { Metadata } from "next"
import { Suspense } from "react"

import { ClientOnly } from "@/components/client-only"
import { SiteNav } from "@/components/site-nav"
import { LoadingNote } from "@/features/audit/loading-note"
import { JobView } from "@/features/audit/job-view"

export const metadata: Metadata = { title: "Job" }

const loading = <LoadingNote what="job" />

/** Imported jobs live in the browser (IndexedDB), so the server only renders the shell. */
export default function JobPage({ params }: PageProps<"/runs/[jobId]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/runs" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 md:px-6">
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
