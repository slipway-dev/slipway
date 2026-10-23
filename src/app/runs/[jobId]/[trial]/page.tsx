import { Suspense } from "react"

import { ClientOnly } from "@/components/client-only"
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import { LoadingNote } from "@/features/audit/loading-note"
import { TrialView } from "@/features/audit/trial-view"


const loading = <LoadingNote what="trial" />

export default function TrialPage({ params }: PageProps<"/runs/[jobId]/[trial]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/runs" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 md:px-6">
        <Suspense fallback={loading}>
          {params.then(({ jobId, trial }) => (
            <ClientOnly fallback={loading}>
              <TrialView jobId={jobId} trialName={decodeURIComponent(trial)} />
            </ClientOnly>
          ))}
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
