import { ArrowRight, CircleX, Lock, ShieldCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import { Button } from "@/components/ui/button"
import { TaskDemo } from "@/features/home/task-demo"
import { getT } from "@/i18n/server"

function FolderVisual({ notes }: { notes: Record<"config" | "instruction" | "dockerfile" | "test" | "solve", string> }) {
  const folder: { path: string; depth: number; note?: string }[] = [
    { path: "hello-world/", depth: 0 },
    { path: "task.toml", depth: 1, note: notes.config },
    { path: "instruction.md", depth: 1, note: notes.instruction },
    { path: "environment/Dockerfile", depth: 1, note: notes.dockerfile },
    { path: "tests/test.sh", depth: 1, note: notes.test },
    { path: "solution/solve.sh", depth: 1, note: notes.solve },
  ]
  return (
    <ul className="flex flex-col gap-1.5 rounded-2xl bg-hull p-6 font-mono text-code text-hull-ink">
      {folder.map((entry) => (
        <li key={entry.path} className="flex items-baseline gap-4">
          <span className={entry.depth ? "pl-5 text-hull-tide" : ""}>{entry.path}</span>
          {entry.note && (
            <span className="ml-auto hidden truncate font-sans text-body-sm text-hull-muted sm:inline">
              {entry.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default async function Home() {
  const t = await getT()
  const h = t.home
  const f = h.features

  const features = [
    {
      key: "compose",
      ...f.compose,
      visual: (
<FolderVisual notes={f.compose.folder} />
      ),
    },
    {
      key: "checks",
      ...f.checks,
      visual: (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface text-body-sm">
          <li className="flex items-start gap-3 p-4">
            <CircleX className="mt-0.5 size-4 shrink-0 text-fail" aria-hidden />
            <span className="flex-1">{t.issues["missing-reward"]()}</span>
          </li>
          <li className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <span className="flex-1">{t.issues["solution-leak"]()}</span>
          </li>
        </ul>
      ),
    },
    {
      key: "audit",
      ...f.audit,
      visual: (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 text-body-sm">
          <div className="flex items-center gap-2 text-ink-muted">
            <span className="font-mono">#2</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-label font-medium">agent</span>
            <span className="font-mono text-label">+0:04</span>
          </div>
          <div className="rounded-xl bg-[color-mix(in_oklch,var(--fail)_8%,transparent)] p-4">
            <p className="flex items-start gap-2 font-medium text-fail">
              <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {f.audit.flag}: {t.runs.rules["solution-access"]}
              </span>
            </p>
          </div>
          <pre className="rounded-xl bg-hull px-4 py-3 text-code text-hull-ink">
            <span className="text-hull-muted">$ </span>cat /solution/solve.sh
          </pre>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />

      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pt-16 pb-24 md:px-8 md:pt-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="flex flex-col items-start gap-7">
            <h1 className="text-display font-semibold text-balance md:text-display-xl">{h.tagline}</h1>
            <p className="max-w-[56ch] text-[17px] leading-7 text-ink-muted">
              {h.lede}
              <code className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-code text-ink">harbor run</code>
              {h.ledeEnd}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="signal">
                <Link href="/studio">
                  {h.getStarted}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-ink-muted">
                <a href="#how">{h.howItWorks}</a>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-body-sm text-ink-muted">
              <Lock className="size-4" aria-hidden />
              {h.localNote}
            </p>
          </div>
          <TaskDemo />
        </section>

        <section className="border-t border-line bg-surface-sunken">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-24 md:px-8">
            <h2 className="max-w-2xl text-display font-semibold text-balance">{f.heading}</h2>
            <div className="flex flex-col gap-20">
              {features.map((feature, i) => (
                <article
                  key={feature.key}
                  className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
                >
                  <div className={i % 2 ? "md:order-2" : undefined}>
                    <h3 className="mb-3 text-[24px] leading-8 font-semibold tracking-[-0.4px]">{feature.title}</h3>
                    <p className="max-w-[52ch] text-ink-muted">{feature.body}</p>
                  </div>
                  <div>{feature.visual}</div>
                </article>
              ))}
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-6 md:items-center">
              <ShieldCheck className="size-6 shrink-0" aria-hidden />
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{f.local.title}</h3>
                <p className="text-body-sm text-ink-muted">{f.local.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-8 border-t border-line">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-24 md:px-8">
            <h2 className="text-display font-semibold">{h.how.heading}</h2>
            <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {h.how.steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink font-mono text-body-sm font-semibold text-paper">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-body-sm text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="rounded-2xl bg-hull p-6 text-hull-ink">
              <p className="mb-3 text-label text-hull-muted">{h.how.thenRun}</p>
              <pre className="overflow-x-auto text-code leading-7">
                <span className="text-hull-muted">$ </span>harbor run -p ./hello-world -a oracle{"   "}
                <span className="text-hull-pass">{h.how.expect1}</span>
                {"\n"}
                <span className="text-hull-muted">$ </span>harbor run -p ./hello-world -a nop{"      "}
                <span className="text-hull-tide">{h.how.expect0}</span>
              </pre>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-24 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex max-w-xl flex-col gap-3">
              <h2 className="text-display font-semibold text-balance">{h.cta.heading}</h2>
              <p className="text-ink-muted">{h.cta.body}</p>
            </div>
            <Button asChild size="lg">
              <Link href="/studio">
                {h.getStarted}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
