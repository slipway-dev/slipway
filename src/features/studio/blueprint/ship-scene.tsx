"use client"

/*
 * three.js is driven imperatively: the camera, scratch vectors and the scene
 * graph are mutated each frame inside useFrame, and event handlers read refs
 * that only change outside render. The React Compiler rules below assume
 * render-pure data and do not fit that model.
 */
/* eslint-disable react-hooks/immutability, react-hooks/refs */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react"
import * as THREE from "three"

import type { SectionKey } from "../slots"

/**
 * The task as a container ship, modelled in three.js from plain geometry
 * so nothing is downloaded: hull = environment, containers = instruction,
 * bridge = verifier, propeller and rudder = solution, mast = task.toml.
 * It is drawn like a CAD view — flat grey solids with ink edges under an
 * orthographic camera — and comes apart along fixed axes.
 *
 * The board is blueprint blue in both themes, so the colours are fixed
 * sRGB values rather than the page's OKLCH tokens (three.js cannot read those).
 */
const INK = new THREE.Color("#0e0e0e")
const EDGE = new THREE.Color("#f2f7ff")
const SIGNAL = new THREE.Color("#ff7a3d")
const TIDE = new THREE.Color("#bfe3ff")
const TONES = ["#2f64a8", "#2a5c9e", "#3570b6", "#2d60a3"]

export const PART_ORDER: readonly SectionKey[] = ["environment", "instruction", "verifier", "solution", "settings"]

/** How far each piece travels when the ship comes apart, in model units. */
const EXPLODE: Record<SectionKey, THREE.Vector3Tuple> = {
  environment: [0, -0.7, 0],
  instruction: [0.4, 1.9, 0],
  verifier: [-1.1, 1.5, 0],
  solution: [-2.2, -0.2, 0],
  settings: [1.6, 1.2, 0],
}

/** Where the callout for each piece attaches, relative to the piece. */
const ANCHOR: Record<SectionKey, THREE.Vector3Tuple> = {
  environment: [1.6, -0.2, 1.3],
  instruction: [0.6, 1.5, -0.9],
  verifier: [-3.9, 2.9, 0],
  solution: [-5.75, -0.1, 0],
  settings: [3.9, 3.3, 0],
}

export interface ShipSceneProps {
  /** 0 = assembled, 1 = taken apart. The scene eases toward it. */
  explode: number
  hovered: SectionKey | null
  onHover: (part: SectionKey | null) => void
  onOpen: (part: SectionKey) => void
  /** Screen positions of the callout anchors, written every frame, in CSS pixels. */
  anchors: RefObject<Partial<Record<SectionKey, { x: number; y: number }>>>
  onFrame: () => void
  reduced: boolean
  /** Number of rows of containers: one per few lines of the instruction, so the cargo grows with it. */
  cargoTiers: number
}

// ---------------------------------------------------------------------------
// Geometry

function hullShape(): THREE.Shape {
  // Plan view, bow toward +x.
  const s = new THREE.Shape()
  s.moveTo(-5, -1.25)
  s.lineTo(2.6, -1.25)
  s.bezierCurveTo(4.1, -1.25, 5.1, -0.55, 5.6, 0)
  s.bezierCurveTo(5.1, 0.55, 4.1, 1.25, 2.6, 1.25)
  s.lineTo(-5, 1.25)
  s.bezierCurveTo(-5.35, 1.25, -5.45, 0.9, -5.45, 0)
  s.bezierCurveTo(-5.45, -0.9, -5.35, -1.25, -5, -1.25)
  return s
}

function extrudeUp(shape: THREE.Shape, depth: number, bevel = 0.04): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 24,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

/** A solid with its feature edges, the basic unit of the drawing. */
function Solid({
  geometry,
  color = TONES[0],
  position,
  rotation,
  scale,
  hot,
}: {
  geometry: THREE.BufferGeometry
  color?: string | THREE.Color
  position?: THREE.Vector3Tuple
  rotation?: THREE.Vector3Tuple
  scale?: THREE.Vector3Tuple
  hot: boolean
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 28), [geometry])
  useEffect(() => () => edges.dispose(), [edges])
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0.05}
          flatShading
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          emissive={hot ? SIGNAL : INK}
          emissiveIntensity={hot ? 0.22 : 0}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={hot ? SIGNAL : EDGE} transparent opacity={hot ? 1 : 0.92} />
      </lineSegments>
    </group>
  )
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cyl = (rt: number, rb: number, h: number, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg)

function useGeometries() {
  return useMemo(() => {
    const plan = hullShape()
    const lower = plan.clone()
    return {
      hull: extrudeUp(plan, 1.15),
      keel: (() => {
        const g = extrudeUp(lower, 0.45, 0.02)
        g.scale(0.93, 1, 0.78)
        return g
      })(),
      boot: (() => {
        const g = extrudeUp(plan, 0.08, 0)
        g.scale(1.004, 1, 1.01)
        return g
      })(),
      deck: (() => {
        const g = extrudeUp(plan, 0.05, 0)
        g.scale(0.97, 1, 0.92)
        return g
      })(),
      container: box(0.92, 0.5, 0.56),
      hatch: box(0.98, 0.06, 2.0),
      bridgeBase: box(1.3, 1.0, 2.1),
      bridgeDeck: box(1.15, 0.5, 2.7),
      wheelhouse: box(0.95, 0.42, 2.0),
      windows: box(0.02, 0.16, 1.7),
      wing: box(0.5, 0.05, 0.4),
      funnel: (() => {
        const g = box(0.6, 1.0, 0.75)
        const p = g.attributes.position
        for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) - 0.18)
        g.computeVertexNormals()
        return g
      })(),
      funnelBand: box(0.63, 0.12, 0.78),
      pole: cyl(0.035, 0.05, 1, 10),
      yard: cyl(0.025, 0.025, 1, 8),
      radar: box(0.6, 0.05, 0.1),
      dome: new THREE.SphereGeometry(0.11, 14, 10),
      hub: cyl(0.16, 0.16, 0.34, 18),
      cone: new THREE.ConeGeometry(0.16, 0.3, 18),
      shaft: cyl(0.05, 0.05, 0.8, 10),
      blade: (() => {
        const s = new THREE.Shape()
        s.moveTo(0, -0.08)
        s.bezierCurveTo(0.25, -0.18, 0.62, -0.12, 0.66, 0.02)
        s.bezierCurveTo(0.6, 0.16, 0.25, 0.14, 0, 0.08)
        s.closePath()
        const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 10 })
        g.translate(0, 0, -0.015)
        return g
      })(),
      rudder: (() => {
        const s = new THREE.Shape()
        s.moveTo(0, 0)
        s.lineTo(0.5, 0)
        s.lineTo(0.42, -0.85)
        s.lineTo(0.02, -0.85)
        s.closePath()
        const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false })
        g.translate(0, 0, -0.035)
        return g
      })(),
      bulwark: box(0.6, 0.18, 2.4),
      crane: box(0.12, 1.2, 0.12),
      jib: box(1.6, 0.08, 0.08),
    }
  }, [])
}

type Geo = ReturnType<typeof useGeometries>

// ---------------------------------------------------------------------------
// Pieces. Every piece is built around the assembled ship's own origin.

function Hull({ g, hot }: { g: Geo; hot: boolean }) {
  return (
    <group>
      <Solid geometry={g.keel} color="#24528f" position={[0, -0.45, 0]} hot={hot} />
      <Solid geometry={g.hull} color={TONES[1]} hot={hot} />
      <Solid geometry={g.boot} color={hot ? SIGNAL : TIDE} position={[0, 0.02, 0]} hot={false} />
      <Solid geometry={g.deck} color="#3a78bf" position={[0, 1.15, 0]} hot={hot} />
      {/* Hatch covers the cargo stands on. */}
      {[-2.2, -1.2, -0.2, 0.8, 1.8].map((x) => (
        <Solid key={x} geometry={g.hatch} color="#3470b5" position={[x, 1.23, 0]} hot={hot} />
      ))}
      <Solid geometry={g.bulwark} color="#2f66aa" position={[4.15, 1.29, 0]} scale={[1, 1, 0.8]} hot={hot} />
    </group>
  )
}

function Cargo({ g, hot, tiers }: { g: Geo; hot: boolean; tiers: number }) {
  const bays = [-2.2, -1.2, -0.2, 0.8, 1.8]
  const rows = [-0.62, 0, 0.62]
  const boxes: { key: string; p: THREE.Vector3Tuple; tone: string }[] = []
  bays.forEach((x, bi) =>
    rows.forEach((z, ri) => {
      // A staggered skyline reads as a loaded ship rather than a block.
      const height = Math.max(1, Math.min(4, tiers - ((bi + ri) % 3 === 0 ? 1 : 0) + (bi === 2 ? 1 : 0)))
      for (let t = 0; t < height; t++) {
        boxes.push({ key: `${bi}-${ri}-${t}`, p: [x, 1.51 + t * 0.52, z], tone: TONES[(bi + ri + t) % TONES.length] })
      }
    }),
  )
  return (
    <group>
      {boxes.map((b) => (
        <Solid key={b.key} geometry={g.container} color={b.tone} position={b.p} hot={hot} />
      ))}
    </group>
  )
}

function Bridge({ g, hot }: { g: Geo; hot: boolean }) {
  return (
    <group position={[-3.75, 1.2, 0]}>
      <Solid geometry={g.bridgeBase} position={[0, 0.5, 0]} color={TONES[2]} hot={hot} />
      <Solid geometry={g.bridgeDeck} position={[0.05, 1.25, 0]} color={TONES[0]} hot={hot} />
      <Solid geometry={g.wheelhouse} position={[0.05, 1.71, 0]} color={TONES[2]} hot={hot} />
      <Solid geometry={g.windows} position={[0.54, 1.73, 0]} color={hot ? SIGNAL : TIDE} hot={false} />
      <Solid geometry={g.wing} position={[0.2, 1.53, 1.5]} hot={hot} />
      <Solid geometry={g.wing} position={[0.2, 1.53, -1.5]} hot={hot} />
      <Solid geometry={g.pole} position={[-0.1, 2.35, 0]} scale={[1, 0.85, 1]} hot={hot} />
      <Solid geometry={g.radar} position={[-0.1, 2.55, 0]} rotation={[0, 0.6, 0]} hot={hot} />
      <Solid geometry={g.dome} position={[-0.35, 2.0, 0.5]} color="#3f7cc4" hot={hot} />
      <Solid geometry={g.funnel} position={[-0.95, 0.7, 0]} color={TONES[1]} hot={hot} />
      <Solid geometry={g.funnelBand} position={[-1.02, 0.98, 0]} color={hot ? SIGNAL : "#e8f2ff"} hot={false} />
    </group>
  )
}

function Propulsion({ g, hot, spin }: { g: Geo; hot: boolean; spin: RefObject<THREE.Group | null> }) {
  return (
    <group position={[-5.45, 0.05, 0]}>
      <Solid geometry={g.shaft} position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} hot={hot} />
      <group ref={spin} position={[-0.2, 0, 0]}>
        <Solid geometry={g.hub} rotation={[0, 0, Math.PI / 2]} color="#3f7cc4" hot={hot} />
        <Solid geometry={g.cone} position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#3f7cc4" hot={hot} />
        {[0, 1, 2, 3].map((i) => (
          <Solid
            key={i}
            geometry={g.blade}
            rotation={[(i * Math.PI) / 2, 0.35, Math.PI / 2]}
            color="#4886cc"
            hot={hot}
          />
        ))}
      </group>
      <Solid geometry={g.rudder} position={[-0.95, 0.75, 0]} color={TONES[2]} hot={hot} />
    </group>
  )
}

function Mast({ g, hot }: { g: Geo; hot: boolean }) {
  return (
    <group position={[3.9, 1.2, 0]}>
      <Solid geometry={g.pole} position={[0, 1.1, 0]} scale={[1.3, 2.2, 1.3]} hot={hot} />
      <Solid geometry={g.yard} position={[0, 1.65, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]} hot={hot} />
      <Solid geometry={g.yard} position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]} hot={hot} />
      <Solid geometry={g.dome} position={[0, 2.25, 0]} scale={[0.6, 0.6, 0.6]} color={hot ? SIGNAL : "#e8f2ff"} hot={false} />
      <Solid geometry={g.crane} position={[-0.7, 0.6, 0.55]} color={TONES[2]} hot={hot} />
      <Solid geometry={g.jib} position={[-1.3, 1.15, 0.55]} rotation={[0, 0, -0.25]} color={TONES[2]} hot={hot} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Scene

function Model({ explode, hovered, onHover, onOpen, anchors, onFrame, reduced, cargoTiers }: ShipSceneProps) {
  const g = useGeometries()
  useEffect(() => () => Object.values(g).forEach((geo) => geo.dispose()), [g])
  const root = useRef<THREE.Group>(null)
  const pieces = useRef<Partial<Record<SectionKey, THREE.Group | null>>>({})
  const spin = useRef<THREE.Group>(null)
  const progress = useRef(reduced ? explode : 0)
  const yaw = useRef(-0.32)
  const drag = useRef<{ x: number; yaw: number; moved: boolean } | null>(null)
  const idle = useRef(0)
  const { camera, size, gl } = useThree()
  const tmp = useMemo(() => new THREE.Vector3(), [])

  // Drag anywhere on the board to turn the ship; a click that did not drag opens a part.
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      drag.current = { x: e.clientX, yaw: yaw.current, moved: false }
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      if (Math.abs(dx) > 3) d.moved = true
      yaw.current = d.yaw + dx * 0.008
      idle.current = 0
    }
    const up = () => {
      setTimeout(() => (drag.current = null), 0)
    }
    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [gl])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const p = reduced ? explode : THREE.MathUtils.damp(progress.current, explode, 3.2, step)
    progress.current = p
    // Ease-in-out on the shared progress so pieces leave slowly, travel, then settle.
    const e = p * p * (3 - 2 * p)

    if (!reduced && !drag.current) {
      idle.current += step
      // A slow sway while nobody is turning it, so the depth reads.
      yaw.current += Math.sin(idle.current * 0.35) * 0.0009
    }
    if (root.current) root.current.rotation.y = yaw.current
    if (spin.current && !reduced) spin.current.rotation.x += step * (0.6 + e * 2.4)

    for (const key of PART_ORDER) {
      const piece = pieces.current[key]
      if (!piece) continue
      const [dx, dy, dz] = EXPLODE[key]
      piece.position.set(dx * e, dy * e, dz * e)
    }

    root.current?.updateMatrixWorld()
    const out = anchors.current
    for (const key of PART_ORDER) {
      const piece = pieces.current[key]
      if (!piece) continue
      tmp.set(...ANCHOR[key]).applyMatrix4(piece.matrixWorld).project(camera)
      out[key] = { x: ((tmp.x + 1) / 2) * size.width, y: ((1 - tmp.y) / 2) * size.height }
    }
    onFrame()
  })

  const handlers = (key: SectionKey) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      onHover(key)
    },
    onPointerOut: () => onHover(null),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (!drag.current?.moved) onOpen(key)
    },
  })

  const set = (key: SectionKey) => (el: THREE.Group | null) => {
    pieces.current[key] = el
  }

  return (
    <group ref={root} position={[0.2, -0.9, 0]}>
      <group ref={set("environment")} {...handlers("environment")}>
        <Hull g={g} hot={hovered === "environment"} />
      </group>
      <group ref={set("instruction")} {...handlers("instruction")}>
        <Cargo g={g} hot={hovered === "instruction"} tiers={cargoTiers} />
      </group>
      <group ref={set("verifier")} {...handlers("verifier")}>
        <Bridge g={g} hot={hovered === "verifier"} />
      </group>
      <group ref={set("solution")} {...handlers("solution")}>
        <Propulsion g={g} hot={hovered === "solution"} spin={spin} />
      </group>
      <group ref={set("settings")} {...handlers("settings")}>
        <Mast g={g} hot={hovered === "settings"} />
      </group>
    </group>
  )
}

/** Fits the orthographic camera to the board, so the ship fills it at any width. */
function Fit() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    // The exploded ship, turned, spans about 16 units wide and 9 tall; leave room for callouts.
    cam.zoom = Math.min(size.width / 17.5, size.height / 10.5)
    cam.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export default function ShipScene(props: ShipSceneProps) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [6, 5.5, 13], zoom: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
      onPointerMissed={() => props.onHover(null)}
      style={{ touchAction: "pan-y" }}
    >
      <Fit />
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 10, 8]} intensity={2.2} />
      <directionalLight position={[-8, 4, -6]} intensity={0.6} />
      <gridHelper args={[30, 60, "#8fb8ea", "#5f8fcb"]} position={[0, -2.4, 0]} material-transparent material-opacity={0.35} />
      <Model {...props} />
    </Canvas>
  )
}
