import type { Metadata } from "next"

import { ClientOnly } from "@/components/client-only"
import { SiteNav } from "@/components/site-nav"
import { RunsHome } from "@/features/audit/runs-home"

export const metadata: Metadata = { title: "Runs" }

export default function RunsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/runs" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 md:px-6">
        <ClientOnly>
          <RunsHome />
        </ClientOnly>
      </main>
    </div>
  )
}
