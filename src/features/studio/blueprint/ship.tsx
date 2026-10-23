import type { SectionKey } from "../slots"

/**
 * The task drawn as a ship, one piece per part of a Harbor task:
 * hull = environment, cargo = instruction, bridge = verifier,
 * helm = solution, mast = task settings. All pieces are drawn in one
 * 1000 × 640 coordinate system as the assembled ship, so they fit together;
 * each carries the offsets that take it to its place in the exploded view.
 */

export const SCENE = { width: 1000, height: 640 } as const

export interface Pose {
  x: number
  y: number
  /** Degrees. */
  r: number
  /** Scale about the piece's own center. */
  s: number
}

export interface PartGeometry {
  key: SectionKey
  /** Where the piece sits in the assembled ship: x, y, width, height. */
  bbox: readonly [number, number, number, number]
  /** Where the piece's center goes in the exploded view, how much it turns and how big it is there. */
  target: { cx: number; cy: number; r: number; s: number }
  /** Label card in the exploded view: horizontal center and top, in scene units. */
  card: { x: number; y: number }
}

export const ASSEMBLED: Pose = { x: 0, y: 0, r: 0, s: 1 }

/** The pose that takes a piece from the assembled ship to its place in the exploded view. */
export function explodedPose(part: PartGeometry): Pose {
  const [x, y, w, h] = part.bbox
  return { x: part.target.cx - (x + w / 2), y: part.target.cy - (y + h / 2), r: part.target.r, s: part.target.s }
}

/** Where a piece's bottom edge is in the exploded view, for the line down to the hull. */
export function explodedBottom(part: PartGeometry): { x: number; y: number } {
  const [, , , h] = part.bbox
  return { x: part.target.cx, y: part.target.cy + (h * part.target.s) / 2 }
}

const CARD_TOP = 172

/**
 * Four pieces in a row above the hull, each with its label below. Order is
 * the order the pieces fly apart, and the tab order.
 */
export const PARTS: readonly PartGeometry[] = [
  { key: "instruction", bbox: [310, 222, 230, 98], target: { cx: 350, cy: 98, r: -3, s: 0.95 }, card: { x: 350, y: CARD_TOP } },
  { key: "verifier", bbox: [570, 220, 130, 100], target: { cx: 590, cy: 96, r: 2, s: 1.1 }, card: { x: 590, y: CARD_TOP } },
  { key: "settings", bbox: [730, 90, 100, 232], target: { cx: 850, cy: 102, r: 3, s: 0.62 }, card: { x: 850, y: CARD_TOP } },
  { key: "solution", bbox: [198, 228, 84, 94], target: { cx: 130, cy: 98, r: -4, s: 1.15 }, card: { x: 130, y: CARD_TOP } },
  { key: "environment", bbox: [170, 320, 660, 102], target: { cx: 500, cy: 405, r: 0, s: 1 }, card: { x: 500, y: 474 } },
]

export const partGeometry = (key: SectionKey) => PARTS.find((p) => p.key === key)!

/** Shared look: hairline-weight ink strokes that stay the same width at any size. */
const line = { vectorEffect: "non-scaling-stroke" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

function Hull() {
  const outline = "M170 320 H830 C805 392 748 420 690 420 H306 C246 420 196 380 170 320 Z"
  return (
    <g stroke="currentColor" strokeWidth={2} fill="var(--surface)" {...line}>
      <clipPath id="ship-hull-clip">
        <path d={outline} />
      </clipPath>
      <path d={outline} />
      <path d="M186 334 H814" strokeWidth={1} fill="none" />
      <g clipPath="url(#ship-hull-clip)" strokeWidth={1} fill="none" opacity={0.55}>
        {[250, 330, 410, 490, 570, 650, 730].map((x) => (
          <path key={x} d={`M${x} 334 V430`} />
        ))}
      </g>
      {[300, 380, 460, 540, 620, 700].map((x) => (
        <circle key={x} cx={x} cy={362} r={7} fill="var(--paper)" />
      ))}
      <g stroke="var(--tide)" fill="none" strokeWidth={2}>
        <path d="M246 404 H748" />
        <path d="M310 413 H690" />
      </g>
    </g>
  )
}

function Cargo() {
  const box = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={72} height={48} rx={2} />
      {[12, 24, 36, 48, 60].map((d) => (
        <path key={d} d={`M${x + d} ${y + 7} V${y + 41}`} strokeWidth={1} opacity={0.5} />
      ))}
    </g>
  )
  return (
    <g stroke="currentColor" strokeWidth={2} fill="var(--surface)" {...line}>
      {box(314, 272)}
      {box(390, 272)}
      {box(466, 272)}
      {box(352, 224)}
      {box(428, 224)}
    </g>
  )
}

function Bridge() {
  return (
    <g stroke="currentColor" strokeWidth={2} fill="var(--surface)" {...line}>
      <rect x={574} y={250} width={122} height={70} rx={2} />
      <rect x={586} y={224} width={98} height={26} rx={2} />
      {[594, 624, 654].map((x) => (
        <rect key={x} x={x} y={232} width={22} height={12} rx={1} fill="var(--paper)" strokeWidth={1.5} />
      ))}
      <path d="M635 224 V198" fill="none" />
      <path d="M619 204 Q635 190 651 204" fill="none" />
      {/* The inspector's shield, with the tick that means it passed. */}
      <path d="M635 262 L657 270 V286 C657 300 647 308 635 312 C623 308 613 300 613 286 V270 Z" />
      <path d="M625 287 L632 294 L646 279" fill="none" strokeWidth={2.5} />
    </g>
  )
}

function Helm() {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
  return (
    <g stroke="currentColor" strokeWidth={2} fill="var(--surface)" {...line}>
      <rect x={232} y={298} width={16} height={24} rx={2} />
      <circle cx={240} cy={262} r={28} fill="none" />
      <circle cx={240} cy={262} r={8} />
      {spokes.map((a) => (
        <g key={a} fill="none">
          <path d={`M${240 + Math.cos(a) * 8} ${262 + Math.sin(a) * 8} L${240 + Math.cos(a) * 42} ${262 + Math.sin(a) * 42}`} />
          <circle cx={240 + Math.cos(a) * 42} cy={262 + Math.sin(a) * 42} r={3} fill="var(--surface)" />
        </g>
      ))}
    </g>
  )
}

function Mast() {
  return (
    <g stroke="currentColor" strokeWidth={2} fill="var(--surface)" {...line}>
      <path d="M780 98 V322" strokeWidth={3} fill="none" />
      <path d="M784 118 V296 H834 Z" />
      <path d="M786 150 H814 M786 190 H822 M786 230 H830 M786 270 H830" strokeWidth={1} fill="none" opacity={0.5} />
      <path d="M780 98 L816 109 L780 120 Z" />
      <path d="M780 98 L836 322" strokeWidth={1} strokeDasharray="3 5" fill="none" opacity={0.6} />
    </g>
  )
}

const SHAPES: Record<SectionKey, () => React.JSX.Element> = {
  environment: Hull,
  instruction: Cargo,
  verifier: Bridge,
  solution: Helm,
  settings: Mast,
}

export function PartShape({ part }: { part: SectionKey }) {
  const Shape = SHAPES[part]
  return <Shape />
}

/** A single piece on its own, for the narrow list. */
export function PartThumb({ part, className }: { part: SectionKey; className?: string }) {
  const [x, y, w, h] = partGeometry(part).bbox
  const pad = 14
  return (
    <svg
      viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <PartShape part={part} />
    </svg>
  )
}
