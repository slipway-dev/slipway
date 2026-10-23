import type { Metadata } from "next"

import { SlipwayLogo } from "@/components/brand/logo"
import { TaskList } from "@/features/studio/task-list"

export const metadata: Metadata = { title: "Studio — Slipway" }

export default function StudioIndex() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 py-4">
        <SlipwayLogo />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-16">
        <TaskList />
      </main>
    </div>
  )
}
