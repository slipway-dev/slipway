import type { Metadata } from "next"
import { Suspense } from "react"

import { Studio } from "@/features/studio/studio"

export const metadata: Metadata = { title: "Studio" }

/** Tasks live in the browser (IndexedDB), so the server only renders the shell. */
export default function StudioPage({ params }: PageProps<"/studio/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <Studio id={id} />
      ))}
    </Suspense>
  )
}
