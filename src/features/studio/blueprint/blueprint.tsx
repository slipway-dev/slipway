"use client"

import { CircleCheck, CircleX, RotateCcw, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { PartLookup } from "@/features/parts/registry"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import type { TaskSimulation } from "@/features/task/simulate"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useT } from "@/i18n/provider"
import type { Messages } from "@/i18n/messages"
import { partText } from "@/i18n/text"
import { cn } from "@/lib/utils"

import { SECTIONS, sectionText, type SectionKey } from "../slots"
import { ASSEMBLED, explodedBottom, explodedPose, PARTS, PartShape, PartThumb, SCENE, type PartGeometry } from "./ship"
import { issuesForPart, summarizePart, type PartSummary } from "./summary"

/** How long the pieces take to fly apart, and how much each waits for the one before. */
const FLIGHT_MS = 1100
const STAGGER_MS = 70
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)"

function summaryText(t: Messages, summary: PartSummary, lookup: PartLookup): string {
  const s = t.blueprint.summary
  switch (summary.kind) {
    case "instruction":
      // The first line of Markdown, without its markup, so a card does not show backticks.
      return summary.firstLine.replace(/[`*_#>]/g, "").trim() || s.emptyInstruction
    case "environment":
      return s.environment(summary.image, summary.parts)
    case "checks":
      return s.checks(summary.count, summary.mode)
    case "steps":
      return s.steps(summary.count)
    case "part": {
      const part = lookup(summary.partId)
      return part ? partText(t, part).name : summary.partId
    }
    case "none":
      return s.none
    case "settings":
      return summary.name || s.unnamed
  }
}

function simulatedRewards(t: Messages, sim: TaskSimulation): string | undefined {
  if (!sim.supported) return undefined
  const reward = (id: string) => {
    const value = sim.runs.find((r) => r.id === id)?.reward
    return value === undefined ? t.blueprint.simUnknown : String(value)
  }
  return t.blueprint.sim(reward("oracle"), reward("nop"))
}

interface CardProps {
  part: SectionKey
  project: TaskProject
  issues: Issue[]
  simulation: TaskSimulation
  lookup: PartLookup
  onOpen: (part: SectionKey) => void
}

function useCardData({ part, project, issues, simulation, lookup }: CardProps) {
  const t = useT()
  const mine = issuesForPart(issues, project, part)
  const errors = mine.filter((i) => i.severity === "error").length
  return {
    label: sectionText(t, part).label,
    target: SECTIONS[part].target,
    Icon: SECTIONS[part].icon,
    summary: summaryText(t, summarizePart(project, part), lookup),
    errors,
    warnings: mine.length - errors,
    rewards: part === "verifier" ? simulatedRewards(t, simulation) : undefined,
  }
}

function Status({ errors, warnings }: { errors: number; warnings: number }) {
  const t = useT().blueprint
  if (errors > 0) {
    return (
      <span className="flex items-center gap-1.5 text-body-sm font-semibold text-fail">
        <CircleX className="size-3.5" aria-hidden />
        {t.errors(errors)}
      </span>
    )
  }
  if (warnings > 0) {
    return (
      <span className="flex items-center gap-1.5 text-body-sm font-semibold text-warn">
        <TriangleAlert className="size-3.5" aria-hidden />
        {t.warnings(warnings)}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-body-sm font-semibold text-pass">
      <CircleCheck className="size-3.5" aria-hidden />
      {t.ready}
    </span>
  )
}

/** A label card in the exploded view; also the button that opens the part. */
function SceneCard(props: CardProps & { geometry: PartGeometry; shown: boolean; delay: number; reduced: boolean; hovered: boolean; setHovered: (hovered: boolean) => void }) {
  const { geometry, shown, delay, reduced, hovered, setHovered, part, onOpen } = props
  const t = useT().blueprint
  const data = useCardData(props)
  return (
    <button
      type="button"
      onClick={() => onOpen(part)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={t.open(data.label)}
      tabIndex={shown ? 0 : -1}
      style={{
        left: `${(geometry.card.x / SCENE.width) * 100}%`,
        top: `${(geometry.card.y / SCENE.height) * 100}%`,
        opacity: shown ? 1 : 0,
        transition: reduced ? "none" : `opacity 400ms ease ${shown ? delay : 0}ms, border-color 150ms, box-shadow 150ms`,
      }}
      className={cn(
        "absolute flex w-[11.25rem] -translate-x-1/2 flex-col items-start gap-1 rounded-xl border bg-surface p-3 text-left",
        shown ? "pointer-events-auto" : "pointer-events-none",
        hovered ? "border-ink shadow-float" : "border-line-strong",
      )}
    >
      <span className="flex items-center gap-2 font-semibold">
        <data.Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
        {data.label}
      </span>
      <span className="font-mono text-code text-ink-muted">{data.target}</span>
      <span className="line-clamp-2 min-h-10 text-body-sm text-ink-muted">{data.summary}</span>
      <Status errors={data.errors} warnings={data.warnings} />
      {data.rewards && <span className="font-mono text-code tabular-nums text-ink-muted">{data.rewards}</span>}
    </button>
  )
}

function Scene(props: Omit<BlueprintProps, "animate" | "onPlayed"> & { phase: "assembled" | "exploded"; reduced: boolean }) {
  const { phase, reduced, onOpen } = props
  const [hovered, setHovered] = useState<SectionKey | null>(null)
  const exploded = phase === "exploded"
  const flight = (delay: number) => (reduced ? "none" : `transform ${FLIGHT_MS}ms ${EASE} ${delay}ms`)
  const hull = PARTS.find((p) => p.key === "environment")!
  const deckY = hull.bbox[1] + explodedPose(hull).y

  return (
    <div className="relative mx-auto aspect-[1000/640] w-full max-w-[1000px] overflow-hidden rounded-2xl border border-line bg-surface-sunken">
      <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id="blueprint-grid" width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
        </defs>
        <rect width={SCENE.width} height={SCENE.height} fill="url(#blueprint-grid)" opacity={0.7} />

        {/* Where each piece mounts on the hull. */}
        <g
          stroke="var(--ink-muted)"
          strokeWidth={1}
          strokeDasharray="4 6"
          fill="none"
          style={{ opacity: exploded ? 0.7 : 0, transition: reduced ? "none" : `opacity 500ms ease ${exploded ? FLIGHT_MS * 0.7 : 0}ms` }}
        >
          {PARTS.filter((p) => p.key !== "environment").map((p) => {
            const [x, , w] = p.bbox
            const bottom = explodedBottom(p)
            return <path key={p.key} d={`M${bottom.x} ${bottom.y} L${x + w / 2} ${deckY}`} vectorEffect="non-scaling-stroke" />
          })}
        </g>

        <g
          style={{
            transform: exploded ? "none" : "translate(0px, 70px) rotate(-6deg) scale(0.86)",
            transformOrigin: "500px 300px",
            transition: flight(0),
          }}
        >
          {PARTS.map((p, i) => {
            const [x, y, w, h] = p.bbox
            const pose = exploded ? explodedPose(p) : ASSEMBLED
            const active = hovered === p.key
            return (
              <g
                key={p.key}
                onPointerEnter={() => setHovered(p.key)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => exploded && onOpen(p.key)}
                className={cn(active ? "text-signal" : "text-ink")}
                style={{
                  transform: `translate(${pose.x}px, ${pose.y}px) rotate(${pose.r}deg) scale(${pose.s})`,
                  transformOrigin: `${x + w / 2}px ${y + h / 2}px`,
                  transition: `${flight(i * STAGGER_MS)}${reduced ? "" : ", color 150ms"}`,
                  cursor: exploded ? "pointer" : "default",
                }}
              >
                <PartShape part={p.key} />
              </g>
            )
          })}
        </g>
      </svg>

      {PARTS.map((p, i) => (
        <SceneCard
          key={p.key}
          {...props}
          part={p.key}
          geometry={p}
          shown={exploded}
          delay={FLIGHT_MS * 0.55 + i * STAGGER_MS}
          reduced={reduced}
          hovered={hovered === p.key}
          setHovered={(on) => setHovered(on ? p.key : null)}
        />
      ))}
    </div>
  )
}

function ListCard(props: CardProps & { index: number }) {
  const { part, onOpen, index } = props
  const t = useT().blueprint
  const data = useCardData(props)
  return (
    <li className="animate-rise" style={{ animationDelay: `${index * STAGGER_MS}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(part)}
        aria-label={t.open(data.label)}
        className="flex w-full items-center gap-4 rounded-xl border border-line-strong bg-surface p-3 text-left hover:border-ink"
      >
        <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink">
          <PartThumb part={part} className="size-full p-1" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="flex items-center gap-2 font-semibold">
            <data.Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
            {data.label}
          </span>
          <span className="font-mono text-code text-ink-muted">{data.target}</span>
          <span className="line-clamp-2 text-body-sm text-ink-muted">{data.summary}</span>
          <Status errors={data.errors} warnings={data.warnings} />
          {data.rewards && <span className="font-mono text-code tabular-nums text-ink-muted">{data.rewards}</span>}
        </span>
      </button>
    </li>
  )
}

export interface BlueprintProps {
  project: TaskProject
  issues: Issue[]
  simulation: TaskSimulation
  lookup: PartLookup
  /** Play the assemble-then-explode animation on arrival. */
  animate: boolean
  onPlayed: () => void
  onOpen: (part: SectionKey) => void
}

/**
 * The first layer of the Studio: the task as a ship, assembled and slightly
 * turned, that comes apart into its five parts. Each part is a button that
 * opens its workbench. Narrow screens get a list of the same parts; reduced
 * motion skips straight to the taken-apart view.
 */
export function Blueprint(props: BlueprintProps) {
  const { animate, onPlayed } = props
  const t = useT().blueprint
  const wide = useMediaQuery("(min-width: 880px)")
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [phase, setPhase] = useState<"assembled" | "exploded">(animate ? "assembled" : "exploded")

  useEffect(() => {
    if (phase !== "assembled") return
    // Let the assembled ship show for a moment so the break-apart reads as a change.
    const timer = setTimeout(() => {
      setPhase("exploded")
      onPlayed()
    }, reduced ? 0 : 500)
    return () => clearTimeout(timer)
  }, [phase, reduced, onPlayed])

  const replay = useCallback(() => setPhase("assembled"), [])

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 p-4 lg:p-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title font-semibold">{t.title}</h2>
          <p className="max-w-prose text-body-sm text-ink-muted">{t.lede}</p>
        </div>
        {wide && (
          <Button variant="ghost" size="sm" onClick={replay} disabled={phase === "assembled"}>
            <RotateCcw />
            {t.replay}
          </Button>
        )}
      </div>
      <section aria-label={t.sceneLabel}>
        {wide ? (
          <Scene {...props} phase={phase} reduced={reduced} />
        ) : (
          <ol className="flex flex-col gap-3">
            {PARTS.map((p, index) => (
              <ListCard key={p.key} {...props} part={p.key} index={index} />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
