"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Box, CircleCheck, CircleX, FileText, GripVertical, Package, RotateCcw } from "lucide-react"
import { useId, useState } from "react"

import { Switch } from "@/components/ui/switch"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

type PartId = "base" | "apt" | "pip" | "file"

/**
 * Dockerfile sections, as in features/parts: parts write into a fixed
 * section, so the order you drag them in never puts COPY before FROM.
 */
const PARTS: Record<PartId, { section: number; icon: typeof Box; lines: string[] }> = {
  base: { section: 0, icon: Box, lines: ["FROM python:3.12-slim", "WORKDIR /app"] },
  apt: {
    section: 1,
    icon: Package,
    lines: ["RUN apt-get update && apt-get install -y jq sqlite3 \\", "    && rm -rf /var/lib/apt/lists/*"],
  },
  pip: { section: 2, icon: Package, lines: ["RUN pip install --no-cache-dir pandas"] },
  file: { section: 3, icon: FileText, lines: ["COPY data.csv /app/data.csv"] },
}

const START: PartId[] = ["file", "base", "pip", "apt"]

function PartRow({
  id,
  on,
  index,
  onToggle,
}: {
  id: PartId
  on: boolean
  index: number
  onToggle: () => void
}) {
  const t = useT().home.demo
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const Icon = PARTS[id].icon
  const text = t.parts[id]
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, animationDelay: `${120 + index * 90}ms` }}
      className={cn(
        "demo-rise flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5",
        isDragging && "relative z-10 shadow-drag",
        !on && "bg-surface-sunken",
      )}
    >
      <button
        type="button"
        className="-m-1 cursor-grab touch-none rounded-md p-1 text-ink-muted hover:text-ink active:cursor-grabbing"
        aria-label={t.reorder(text.name)}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken",
          !on && "opacity-50",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col", !on && "opacity-50")}>
        <span className="text-body-sm font-semibold">{text.name}</span>
        <span className="truncate font-mono text-label text-ink-muted">{text.detail}</span>
      </span>
      <Switch checked={on} onCheckedChange={onToggle} aria-label={t.on(text.name)} />
    </li>
  )
}

/**
 * A working miniature of the Studio: real drag-and-drop over parts, with
 * the Dockerfile and the FROM check recomputed on every change. The data
 * is illustrative; the section ordering is the same rule compose uses.
 */
export function TaskDemo() {
  const t = useT().home.demo
  const [order, setOrder] = useState<PartId[]>(START)
  const [off, setOff] = useState<Set<PartId>>(new Set())
  const [run, setRun] = useState(0)
  const dndId = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const active = order.filter((id) => !off.has(id))
  const dockerfile = [...active]
    .sort((a, b) => PARTS[a].section - PARTS[b].section)
    .flatMap((id) => [...PARTS[id].lines, ""])
  const hasFrom = active.includes("base")

  function onDragEnd({ active: from, over }: DragEndEvent) {
    if (!over || from.id === over.id) return
    setOrder((o) => arrayMove(o, o.indexOf(from.id as PartId), o.indexOf(over.id as PartId)))
  }

  return (
    <div
      key={run}
      className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-float)]"
      role="group"
      aria-label={t.label}
    >
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="ml-2 truncate font-mono text-label text-ink-muted">my-org/csv-stats · environment/</span>
        <button
          type="button"
          onClick={() => {
            setOrder(START)
            setOff(new Set())
            setRun((r) => r + 1)
          }}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-label text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          {t.replay}
        </button>
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex min-w-0 flex-col gap-3 p-5">
          <p className="text-body-sm text-ink-muted">{t.hint}</p>
          <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {order.map((id, i) => (
                  <PartRow
                    key={id}
                    id={id}
                    index={i}
                    on={!off.has(id)}
                    onToggle={() =>
                      setOff((s) => {
                        const next = new Set(s)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      })
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex min-h-80 min-w-0 flex-col bg-hull text-hull-ink">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className="font-mono text-label text-hull-muted">{t.generated}</span>
          </div>
          <pre className="flex-1 overflow-x-auto px-5 py-4 text-code" aria-live="polite">
            {dockerfile.map((line, i) => (
              <span
                key={`${run}-${line}-${i}`}
                className="demo-line block"
                style={{ animationDelay: `${400 + i * 70}ms` }}
              >
                <span className="mr-4 inline-block w-4 text-right text-hull-muted select-none">{i + 1}</span>
                {line.startsWith("FROM") || line.startsWith("RUN") || line.startsWith("COPY") || line.startsWith("WORKDIR") ? (
                  <>
                    <span className="text-hull-signal">{line.split(" ")[0]}</span>
                    {line.slice(line.indexOf(" "))}
                  </>
                ) : (
                  line || " "
                )}
              </span>
            ))}
          </pre>
          <div
            className={cn(
              "flex items-center gap-2 border-t border-white/10 px-5 py-3 text-body-sm",
              hasFrom ? "text-hull-pass" : "text-[oklch(78%_0.15_25)]",
            )}
            aria-live="polite"
          >
            {hasFrom ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
            <span className="shrink-0">{hasFrom ? t.ready : t.noFrom}</span>
            {hasFrom && (
              <span className="ml-auto hidden truncate text-label text-hull-muted xl:inline">{t.sectionNote}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
