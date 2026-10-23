import type { Metadata } from "next"

import { SiteNav } from "@/components/site-nav"
import { TaskList } from "@/features/studio/task-list"

export const metadata: Metadata = { title: "Studio — Slipway" }

export default function StudioIndex() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav current="/studio" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
        <TaskList />
      </main>
    </div>
  )
}
