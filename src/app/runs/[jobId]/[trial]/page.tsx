import type { Metadata } from "next"
import { Suspense } from "react"

import { ClientOnly } from "@/components/client-only"
import { SiteNav } from "@/components/site-nav"
import { TrialView } from "@/features/audit/trial-view"

export const metadata: Metadata = { title: "Trial — Slipway" }

const loading = <p className="text-body-sm text-ink-muted">Loading trial…</p>

export default function TrialPage({ params }: PageProps<"/runs/[jobId]/[trial]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/runs" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
        <Suspense fallback={loading}>
          {params.then(({ jobId, trial }) => (
            <ClientOnly fallback={loading}>
              <TrialView jobId={jobId} trialName={decodeURIComponent(trial)} />
            </ClientOnly>
          ))}
        </Suspense>
      </main>
    </div>
  )
}
