"use client"

import { ArrowRight, CircleCheck, CircleHelp, CircleX, Move3d, RotateCcw, TriangleAlert } from "lucide-react"
import dynamic from "next/dynamic"
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { nodeLabel, type FlowNode } from "@/features/flow/types"
import type { PartLookup } from "@/features/parts/registry"
import type { TaskFile } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import type { SimRun, TaskSimulation } from "@/features/task/simulate"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Messages } from "@/i18n/messages"
import { useT } from "@/i18n/provider"
import { partText } from "@/i18n/text"
import { cn } from "@/lib/utils"

import { SECTIONS, sectionText, type SectionKey } from "../slots"
import { taskFacts, type TaskFacts } from "./facts"
import { PART_ORDER, type ShipSceneProps } from "./ship-scene"
import { issuesForPart } from "./summary"

const ShipScene = dynamic(() => import("./ship-scene"), { ssr: false })

/** Which way each callout's label sits from its anchor, so labels clear the model. */
const CALLOUT: Record<SectionKey, { dx: number; dy: number }> = {
  environment: { dx: 56, dy: 44 },
  instruction: { dx: 64, dy: -46 },
  verifier: { dx: -72, dy: -40 },
  solution: { dx: -60, dy: 48 },
  settings: { dx: 64, dy: -36 },
}

const num = (i: number) => String(i + 1).padStart(2, "0")

// ---------------------------------------------------------------------------
// Status

interface PartStatus {
  errors: number
  warnings: number
}

function StatusMark({ status, compact }: { status: PartStatus; compact?: boolean }) {
  const t = useT().blueprint
  const [Icon, tone, text] =
    status.errors > 0
      ? [CircleX, "text-fail", t.errors(status.errors)]
      : status.warnings > 0
        ? [TriangleAlert, "text-warn", t.warnings(status.warnings)]
        : [CircleCheck, "text-pass", t.ready]
  return (
    <span className={cn("flex items-center gap-1.5 font-medium", tone, compact ? "text-label" : "text-body-sm")}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  )
}

function rewardText(t: Messages, run: SimRun | undefined) {
  return run?.reward === undefined ? t.blueprint.simUnknown : String(run.reward)
}

// ---------------------------------------------------------------------------
// The board

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Board({
  project,
  status,
  hovered,
  setHovered,
  onOpen,
  explode,
  reduced,
  dirName,
}: {
  project: TaskProject
  status: Record<SectionKey, PartStatus>
  hovered: SectionKey | null
  setHovered: (part: SectionKey | null) => void
  onOpen: (part: SectionKey) => void
  explode: number
  reduced: boolean
  dirName: string
}) {
  const t = useT()
  const b = t.blueprint
  const anchors = useRef<Partial<Record<SectionKey, { x: number; y: number }>>>({})
  const tags = useRef<Partial<Record<SectionKey, HTMLElement | null>>>({})
  const lines = useRef<Partial<Record<SectionKey, SVGPolylineElement | null>>>({})
  const dots = useRef<Partial<Record<SectionKey, SVGCircleElement | null>>>({})
  const wideBoard = useMediaQuery("(min-width: 720px)")
  const lineCount = project.instruction.trim() ? project.instruction.trim().split("\n").length : 0
  const cargoTiers = Math.max(2, Math.min(4, 1 + Math.ceil(lineCount / 6)))

  // Move the callouts with the model, straight in the DOM, once per frame.
  const onFrame = useCallback(() => {
    for (const key of PART_ORDER) {
      const a = anchors.current[key]
      const tag = tags.current[key]
      if (!a || !tag) continue
      const { dx, dy } = CALLOUT[key]
      const sx = wideBoard ? dx : dx * 0.5
      const sy = wideBoard ? dy : dy * 0.6
      const ex = a.x + sx
      const ey = a.y + sy
      tag.style.transform = `translate(${ex}px, ${ey}px) translate(${sx < 0 ? "-100%" : "0"}, -50%)`
      tag.style.opacity = "1"
      // Leader: out from the anchor at an angle, then level into the label.
      const kx = a.x + sx * 0.55
      lines.current[key]?.setAttribute("points", `${a.x},${a.y} ${kx},${ey} ${ex},${ey}`)
      dots.current[key]?.setAttribute("cx", String(a.x))
      dots.current[key]?.setAttribute("cy", String(a.y))
    }
  }, [wideBoard])

  const props: ShipSceneProps = {
    explode,
    hovered,
    onHover: setHovered,
    onOpen,
    anchors,
    onFrame,
    reduced,
    cargoTiers,
  }

  return (
    <div
      className="relative h-[clamp(360px,64vh,760px)] w-full overflow-hidden rounded-2xl bg-hull text-hull-ink ring-1 ring-line select-none"
      style={{
        backgroundImage:
          "linear-gradient(oklch(100% 0 0 / 0.045) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.045) 1px, transparent 1px), linear-gradient(oklch(100% 0 0 / 0.02) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.02) 1px, transparent 1px)",
        backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
      }}
    >
      {/* Drawing frame: a margin rule with ticks, like a sheet. */}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-xl border border-white/10" />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-3 flex justify-between px-4 font-mono text-[10px] text-hull-muted/70">
        {"ABCDEFGH".split("").map((c) => (
          <span key={c} className="pt-1">
            {c}
          </span>
        ))}
      </div>

      <SceneBoundary
        fallback={
          <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-body-sm text-hull-muted">
            {b.no3d}
          </p>
        }
      >
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
          <ShipScene {...props} />
        </div>
      </SceneBoundary>

      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {PART_ORDER.map((key) => (
          <g key={key} className={cn("transition-opacity duration-300", explode > 0.5 ? "opacity-100" : "opacity-0")}>
            <polyline
              ref={(el) => void (lines.current[key] = el)}
              fill="none"
              stroke={hovered === key ? "var(--hull-signal)" : "oklch(100% 0 0 / 0.45)"}
              strokeWidth={1}
            />
            <circle
              ref={(el) => void (dots.current[key] = el)}
              r={3}
              fill={hovered === key ? "var(--hull-signal)" : "var(--hull)"}
              stroke={hovered === key ? "var(--hull-signal)" : "oklch(100% 0 0 / 0.7)"}
            />
          </g>
        ))}
      </svg>

      {PART_ORDER.map((key, i) => {
        const s = status[key]
        const label = sectionText(t, key).label
        return (
          <button
            key={key}
            ref={(el) => void (tags.current[key] = el)}
            type="button"
            onClick={() => onOpen(key)}
            onPointerEnter={() => setHovered(key)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(key)}
            onBlur={() => setHovered(null)}
            aria-label={b.open(label)}
            tabIndex={explode > 0.5 ? 0 : -1}
            style={{ opacity: 0 }}
            className={cn(
              "absolute top-0 left-0 flex items-center gap-2 rounded-lg border bg-hull/90 px-2.5 py-1.5 whitespace-nowrap backdrop-blur-sm transition-[border-color,opacity,visibility] duration-300",
              explode > 0.5 ? "visible" : "invisible",
              hovered === key ? "border-hull-signal" : "border-white/15",
            )}
          >
            <span className={cn("font-mono text-label", hovered === key ? "text-hull-signal" : "text-hull-muted")}>
              {num(i)}
            </span>
            <span className="hidden text-body-sm font-semibold sm:inline">{label}</span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                s.errors ? "bg-[oklch(72%_0.17_25)]" : s.warnings ? "bg-hull-warn" : "bg-hull-pass",
              )}
            />
          </button>
        )
      })}

      <p className="pointer-events-none absolute top-9 left-7 flex items-center gap-2 text-label text-hull-muted">
        <Move3d className="size-3.5" aria-hidden />
        {b.dragHint}
      </p>

      {/* Title block, lower right, as on a sheet. */}
      <dl className="pointer-events-none absolute right-6 bottom-6 hidden grid-cols-[auto_auto] border border-white/15 font-mono text-[11px] leading-4 text-hull-muted md:grid">
        <dt className="border-r border-b border-white/15 px-2 py-1">{b.sheet.task}</dt>
        <dd className="max-w-56 truncate border-b border-white/15 px-2 py-1 text-hull-ink">{dirName}</dd>
        <dt className="border-r border-b border-white/15 px-2 py-1">{b.sheet.drawing}</dt>
        <dd className="border-b border-white/15 px-2 py-1 text-hull-ink">{b.sheet.exploded}</dd>
        <dt className="border-r border-white/15 px-2 py-1">{b.sheet.scale}</dt>
        <dd className="px-2 py-1 text-hull-ink">{b.sheet.notToScale}</dd>
      </dl>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panels

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <dt className="shrink-0 text-body-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-mono text-code">{children}</dd>
    </div>
  )
}

function Chips({ items, more }: { items: string[]; more: (n: number) => string }) {
  const shown = items.slice(0, 6)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item, i) => (
        <span key={`${item}-${i}`} className="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-label">
          {item}
        </span>
      ))}
      {items.length > shown.length && (
        <span className="px-1 py-0.5 text-label text-ink-muted">{more(items.length - shown.length)}</span>
      )}
    </div>
  )
}

/** A flow (checks or steps) as a numbered list, with each check's result under the oracle run. */
function FlowList({ nodes, results, empty }: { nodes: FlowNode[]; results?: SimRun; empty: string }) {
  const t = useT()
  if (!nodes.length) return <p className="text-body-sm text-ink-muted">{empty}</p>
  const shown = nodes.slice(0, 4)
  return (
    <ol className="flex flex-col gap-1">
      {shown.map((node, i) => {
        const status = results?.checks.find((c) => c.id === node.id)?.status
        const Icon = status === "pass" ? CircleCheck : status === "fail" ? CircleX : CircleHelp
        return (
          <li key={node.id} className="flex items-center gap-2 text-body-sm">
            <span className="w-4 shrink-0 font-mono text-label text-ink-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{nodeLabel(node)}</span>
            {results && (
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  status === "pass" ? "text-pass" : status === "fail" ? "text-fail" : "text-ink-muted",
                )}
                aria-label={status ?? "unknown"}
              />
            )}
          </li>
        )
      })}
      {nodes.length > shown.length && (
        <li className="pl-6 text-label text-ink-muted">{t.blueprint.more(nodes.length - shown.length)}</li>
      )}
    </ol>
  )
}

function PanelBody({
  part,
  facts,
  simulation,
  lookup,
}: {
  part: SectionKey
  facts: TaskFacts
  simulation: TaskSimulation
  lookup: PartLookup
}) {
  const t = useT()
  const f = t.blueprint.facts
  const none = t.blueprint.simUnknown
  const runner = (id: string | undefined) => {
    if (!id) return none
    const p = lookup(id)
    return p ? partText(t, p).name : id
  }
  const oracle = simulation.runs.find((r) => r.id === "oracle")

  switch (part) {
    case "instruction": {
      const x = facts.instruction
      return (
        <div className="flex flex-col gap-3">
          <p className="line-clamp-3 border-l-2 border-line-strong pl-3 text-body-sm text-ink-muted">
            {x.firstLine.replace(/[`*_#>]/g, "").trim() || t.blueprint.summary.emptyInstruction}
          </p>
          <dl>
            <Row label={f.words}>{x.words}</Row>
            <Row label={f.lines}>{x.lines}</Row>
            <Row label={f.headings}>{x.headings}</Row>
          </dl>
        </div>
      )
    }
    case "environment": {
      const x = facts.environment
      return (
        <div className="flex flex-col gap-3">
          <dl>
            <Row label={f.image}>{x.image ?? none}</Row>
            <Row label={f.workdir}>{x.workdir ?? none}</Row>
            <Row label={f.resources}>{f.resourceValue(x.cpus, x.memoryMb) ?? none}</Row>
            <Row label={f.network}>{x.network ?? none}</Row>
            <Row label={f.files}>{x.files}</Row>
          </dl>
          {x.packages.length > 0 && <Chips items={x.packages} more={t.blueprint.more} />}
        </div>
      )
    }
    case "verifier": {
      const x = facts.verifier
      return (
        <div className="flex flex-col gap-3">
          <dl>
            <Row label={f.runner}>{runner(x.runner)}</Row>
            {x.checks.length > 0 && <Row label={f.reward}>{x.reward === "all" ? f.rewardAll : f.rewardWeighted}</Row>}
            <Row label={f.timeout}>{x.timeoutSec !== undefined ? f.seconds(x.timeoutSec) : none}</Row>
          </dl>
          {x.runner === "slipway/checks" && (
            <FlowList nodes={x.checks} results={simulation.supported ? oracle : undefined} empty={f.noChecks} />
          )}
        </div>
      )
    }
    case "solution": {
      const x = facts.solution
      return (
        <div className="flex flex-col gap-3">
          <dl>
            <Row label={f.runner}>{runner(x.runner)}</Row>
            {x.runner === "slipway/solution-steps" && <Row label={f.steps}>{x.steps.length}</Row>}
          </dl>
          {x.runner === "slipway/solution-steps" && <FlowList nodes={x.steps} empty={f.noSteps} />}
        </div>
      )
    }
    case "settings": {
      const x = facts.settings
      return (
        <div className="flex flex-col gap-3">
          <dl>
            <Row label={f.name}>{x.name || t.blueprint.summary.unnamed}</Row>
            <Row label={f.version}>{x.version ?? none}</Row>
            <Row label={f.authors}>{x.authors}</Row>
            <Row label={f.agentTimeout}>{x.agentTimeoutSec !== undefined ? f.seconds(x.agentTimeoutSec) : none}</Row>
          </dl>
          {x.keywords.length > 0 && <Chips items={x.keywords} more={t.blueprint.more} />}
        </div>
      )
    }
  }
}

function Panel({
  part,
  index,
  status,
  hovered,
  setHovered,
  onOpen,
  children,
}: {
  part: SectionKey
  index: number
  status: PartStatus
  hovered: boolean
  setHovered: (on: boolean) => void
  onOpen: () => void
  children: ReactNode
}) {
  const t = useT()
  const { label, hint } = sectionText(t, part)
  const Icon = SECTIONS[part].icon
  return (
    <article
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "animate-rise flex min-w-0 flex-col rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-150",
        hovered ? "border-ink shadow-float" : "border-line",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <header className="flex items-start gap-3 border-b border-line p-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[10px] border",
            hovered ? "border-signal bg-signal text-on-signal" : "border-line bg-surface-sunken",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="flex items-baseline gap-2 font-semibold">
            <span className="font-mono text-label text-ink-muted">{num(index)}</span>
            <span className="truncate">{label}</span>
          </h3>
          <span className="truncate font-mono text-label text-ink-muted" title={hint}>
            {SECTIONS[part].target}
          </span>
        </div>
      </header>
      <div className="flex-1 p-4">{children}</div>
      <footer className="flex items-center justify-between gap-2 border-t border-line py-2 pr-2 pl-4">
        <StatusMark status={status} compact />
        <Button variant="ghost" size="sm" onClick={onOpen} aria-label={t.blueprint.open(label)}>
          {t.blueprint.openShort}
          <ArrowRight />
        </Button>
      </footer>
    </article>
  )
}

function Metric({
  label,
  value,
  tone,
  note,
  className,
}: {
  label: string
  value: ReactNode
  tone?: string
  note?: string
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-5 py-4", className)}>
      <span className="text-label text-ink-muted">{label}</span>
      <span className={cn("truncate font-mono text-[22px] leading-7 font-semibold tabular-nums", tone)}>{value}</span>
      {note && <span className="truncate text-label text-ink-muted">{note}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------

export interface BlueprintProps {
  project: TaskProject
  files: TaskFile[]
  issues: Issue[]
  simulation: TaskSimulation
  lookup: PartLookup
  dirName: string
  /** Play the assemble-then-take-apart animation on arrival. */
  animate: boolean
  onPlayed: () => void
  onOpen: (part: SectionKey) => void
}

/**
 * The first layer of the Studio, and its overview: a 3D drawing of the task
 * as a ship that comes apart into its five parts, the numbers that matter
 * across the whole task, and a panel per part with what it holds now. Every
 * piece, callout and panel opens that part's workbench.
 */
export function Blueprint({ project, files, issues, simulation, lookup, dirName, animate, onPlayed, onOpen }: BlueprintProps) {
  const t = useT()
  const b = t.blueprint
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [explode, setExplode] = useState(animate && !reduced ? 0 : 1)
  const [hovered, setHovered] = useState<SectionKey | null>(null)

  useEffect(() => {
    if (explode === 1 || !animate) return
    // Let the assembled ship show for a moment so the coming apart reads as a change.
    const timer = setTimeout(() => {
      setExplode(1)
      onPlayed()
    }, 700)
    return () => clearTimeout(timer)
  }, [explode, animate, onPlayed])

  const facts = useMemo(() => taskFacts(project), [project])
  const status = useMemo(() => {
    const out = {} as Record<SectionKey, PartStatus>
    for (const key of PART_ORDER) {
      const mine = issuesForPart(issues, project, key)
      const errors = mine.filter((i) => i.severity === "error").length
      out[key] = { errors, warnings: mine.length - errors }
    }
    return out
  }, [issues, project])

  const errors = issues.filter((i) => i.severity === "error").length
  const warnings = issues.length - errors
  const oracle = simulation.runs.find((r) => r.id === "oracle")
  const nop = simulation.runs.find((r) => r.id === "nop")
  const runTone = (run: SimRun | undefined) =>
    run?.outcome === "as-expected" ? "text-pass" : run?.outcome === "unknown" || !run ? undefined : "text-fail"

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-semibold">{b.title}</h2>
          <p className="max-w-prose text-body-sm text-ink-muted">{b.lede}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExplode((e) => (e > 0.5 ? 0 : 1))}>
            {explode > 0.5 ? b.assemble : b.explode}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={reduced}
            onClick={() => {
              setExplode(0)
              setTimeout(() => setExplode(1), 900)
            }}
          >
            <RotateCcw />
            {b.replay}
          </Button>
        </div>
      </div>

      <section
        aria-label={b.kpis.label}
        className="grid grid-cols-2 divide-line overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-3 lg:grid-cols-5 [&>*]:border-line max-sm:[&>*:nth-child(odd)]:border-r max-sm:[&>*:not(:nth-last-child(-n+1))]:border-b sm:max-lg:[&>*:not(:nth-child(3n))]:border-r sm:max-lg:[&>*:nth-child(-n+3)]:border-b lg:[&>*:not(:last-child)]:border-r"
      >
        <Metric
          label={b.kpis.checks}
          value={errors ? b.errors(errors) : warnings ? b.warnings(warnings) : b.ready}
          tone={errors ? "text-fail" : warnings ? "text-warn" : "text-pass"}
          note={b.kpis.checksNote(issues.length)}
        />
        <Metric
          label="oracle"
          value={simulation.supported ? rewardText(t, oracle) : b.simUnknown}
          tone={simulation.supported ? runTone(oracle) : undefined}
          note={simulation.supported ? b.kpis.expects(1) : b.kpis.unverified}
        />
        <Metric
          label="nop"
          value={simulation.supported ? rewardText(t, nop) : b.simUnknown}
          tone={simulation.supported ? runTone(nop) : undefined}
          note={simulation.supported ? b.kpis.expects(0) : b.kpis.unverified}
        />
        <Metric label={b.kpis.files} value={files.length} note={b.kpis.filesNote} />
        <Metric
          className="max-sm:col-span-2"
          label={b.kpis.image}
          value={<span className="text-[15px]">{facts.environment.image ?? b.simUnknown}</span>}
          note={b.kpis.imageNote(facts.environment.packages.length)}
        />
      </section>

      <section aria-label={b.sceneLabel}>
        <Board
          project={project}
          status={status}
          hovered={hovered}
          setHovered={setHovered}
          onOpen={onOpen}
          explode={explode}
          reduced={reduced}
          dirName={dirName}
        />
      </section>

      <section aria-label={b.partsLabel} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {PART_ORDER.map((key, i) => (
          <Panel
            key={key}
            part={key}
            index={i}
            status={status[key]}
            hovered={hovered === key}
            setHovered={(on) => setHovered(on ? key : null)}
            onOpen={() => onOpen(key)}
          >
            <PanelBody part={key} facts={facts} simulation={simulation} lookup={lookup} />
          </Panel>
        ))}
      </section>
    </div>
  )
}
