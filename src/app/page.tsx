import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { getT } from "@/i18n/server"

export default async function Home() {
  const t = await getT()
  const notes = t.home.folderNotes
  const folder: { path: string; depth: number; note?: string }[] = [
    { path: "hello-world/", depth: 0 },
    { path: "task.toml", depth: 1, note: notes.config },
    { path: "instruction.md", depth: 1, note: notes.instruction },
    { path: "environment/", depth: 1 },
    { path: "Dockerfile", depth: 2, note: notes.dockerfile },
    { path: "tests/", depth: 1 },
    { path: "test.sh", depth: 2, note: notes.test },
    { path: "solution/", depth: 1 },
    { path: "solve.sh", depth: 2, note: notes.solve },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />

      <main className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-12 px-4 pt-12 pb-16 md:px-6 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <section className="flex flex-col items-start gap-6">
          <h1 className="text-display font-bold text-balance md:text-display-xl">{t.home.tagline}</h1>
          <p className="max-w-[60ch] text-ink-muted">
            {t.home.lede}
            <code className="text-code text-ink">harbor run</code>
            {t.home.ledeEnd}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild size="lg">
              <Link href="/studio">
                {t.home.openStudio}
                <ArrowRight />
              </Link>
            </Button>
            <Link href="/runs" className="text-tide underline-offset-4 hover:underline">
              {t.home.auditRuns}
            </Link>
          </div>
        </section>

        <figure className="flex flex-col overflow-hidden rounded-lg bg-hull text-hull-ink">
          <figcaption className="border-b border-white/10 px-5 py-3 text-label tracking-wide text-hull-muted uppercase">
            {t.home.folderCaption}
          </figcaption>
          <ul className="flex flex-col gap-0.5 px-5 py-4 font-mono text-code">
            {folder.map((entry) => (
              <li key={entry.path + entry.depth} className="flex items-baseline gap-4">
                <span
                  className={entry.path.endsWith("/") ? "text-hull-ink" : "text-hull-tide"}
                  style={{ paddingLeft: entry.depth * 18 }}
                >
                  {entry.path}
                </span>
                {entry.note && (
                  <span className="ml-auto truncate pl-4 font-sans text-body-sm text-hull-muted">{entry.note}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 px-5 py-4">
            <p className="mb-2 text-label tracking-wide text-hull-muted uppercase">{t.home.thenRun}</p>
            <pre className="overflow-x-auto text-code">
              <span className="text-hull-muted">$ </span>harbor run -p ./hello-world -a oracle{"  "}
              <span className="text-hull-pass">{t.home.expect1}</span>
              {"\n"}
              <span className="text-hull-muted">$ </span>harbor run -p ./hello-world -a nop{"     "}
              <span className="text-hull-tide">{t.home.expect0}</span>
            </pre>
          </div>
        </figure>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-7xl px-4 py-6 text-body-sm text-ink-muted md:px-6">{t.home.footer}</p>
      </footer>
    </div>
  )
}
