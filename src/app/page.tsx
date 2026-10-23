import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { SlipwayLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

const STEPS = [
  {
    label: "Instruction",
    text: "Write what the agent sees in instruction.md.",
  },
  {
    label: "Environment",
    text: "Stack a base image, packages, files and policies into environment/Dockerfile and task.toml.",
  },
  {
    label: "Verifier",
    text: "Pick a verifier that writes /logs/verifier/reward.txt: pytest, a command, a file match or your own script.",
  },
  {
    label: "Solution",
    text: "Add solution/solve.sh so oracle can score 1 while nop scores 0.",
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <SlipwayLogo />
        <nav className="flex items-center gap-4 text-body-sm">
          <a href="https://harborframework.com/docs" className="text-tide underline-offset-4 hover:underline">
            Harbor docs
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pt-12 pb-16 md:pt-20">
        <section className="flex max-w-3xl flex-col items-start gap-6">
          <h1 className="text-display font-bold md:text-display-xl">
            Build Harbor tasks visually. Launch them anywhere.
          </h1>
          <p className="max-w-2xl text-ink-muted">
            Harbor tasks are just folders — an instruction, a Dockerfile, a test script and an optional
            solution. Slipway puts the whole task on one canvas: stack environment and verifier parts,
            edit every file side by side, and Launch a folder that <code className="text-code">harbor run</code> takes
            as-is.
          </p>
          <Button asChild size="lg">
            <Link href="/studio">
              Open Studio
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.label} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
              <span className="text-label uppercase text-ink-muted">
                {i + 1} · {step.label}
              </span>
              <p className="text-body-sm">{step.text}</p>
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-2 rounded-lg bg-hull p-4 text-hull-ink">
          <span className="text-label uppercase opacity-80">Then, in your terminal</span>
          <pre className="overflow-x-auto text-code">
            {"harbor run -p ./hello-world -a oracle   # expect 1\nharbor run -p ./hello-world -a nop      # expect 0"}
          </pre>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-body-sm text-ink-muted">
        Slipway is a community tool for Harbor. Harbor-compatible, not an official Harbor project.
      </footer>
    </div>
  )
}
