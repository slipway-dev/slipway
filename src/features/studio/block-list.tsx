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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, CircleX, GripVertical, MoreHorizontal, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { defaultParams, type PartLookup } from "@/features/parts/registry"
import type { Block, SlotId } from "@/features/parts/types"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import { useStudio } from "@/features/task/store"
import { useT } from "@/i18n/provider"
import { issueText, paramText, partText } from "@/i18n/text"
import { cn } from "@/lib/utils"

import { ParamField } from "./param-field"
import { PartPicker } from "./part-picker"
import { SECTIONS, sectionText } from "./slots"

interface BlockCardProps {
  projectId: string
  slot: SlotId
  block: Block
  lookup: PartLookup
  issues: Issue[]
}

function BlockCard({ projectId, slot, block, lookup, issues }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const t = useT()
  const b = t.studio.blocks
  const [expanded, setExpanded] = useState(true)
  const updateParam = useStudio((s) => s.updateBlockParam)
  const toggleBlock = useStudio((s) => s.toggleBlock)
  const removeBlock = useStudio((s) => s.removeBlock)
  const part = lookup(block.partId)
  const Icon = SECTIONS[slot].icon
  const bodyId = `block-${block.id}-body`
  const params = part ? { ...defaultParams(part), ...block.params } : block.params
  const name = part ? partText(t, part).name : block.partId

  return (
    <li
      ref={setNodeRef}
      id={`block-${block.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "rounded-xl border border-line bg-surface",
        isDragging && "relative z-10 shadow-drag",
        block.disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          type="button"
          className="cursor-grab touch-none rounded-sm text-ink-muted"
          aria-label={b.reorder(name)}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="truncate font-semibold">{name}</span>
          {part?.role && (
            <Badge variant="secondary" className="text-label">
              {part.role}
            </Badge>
          )}
          {block.disabled && <Badge variant="outline">{b.off}</Badge>}
          <ChevronDown className={cn("ml-auto size-4 shrink-0 transition-transform", !expanded && "-rotate-90")} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={b.more(name)}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => toggleBlock(projectId, slot, block.id)}>
              {block.disabled ? b.turnOn : b.turnOff}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => removeBlock(projectId, slot, block.id)}>
              {b.remove}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 px-4 pb-3 text-body-sm">
          {issues.map((issue) => (
            <li
              key={issue.code + issue.message}
              className={cn("flex items-start gap-2", issue.severity === "error" ? "text-fail" : "text-warn")}
            >
              {issue.severity === "error" ? (
                <CircleX className="mt-0.5 size-4 shrink-0" aria-label={t.studio.checks.error} />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-label={t.studio.checks.warning} />
              )}
              {issueText(t, issue)}
            </li>
          ))}
        </ul>
      )}

      {expanded && part && (
        <div id={bodyId} className="flex flex-col gap-5 border-t border-line p-5">
          <p className="text-body-sm text-ink-muted">{partText(t, part).summary}</p>
          {part.params.map((spec) => (
            <ParamField
              key={spec.key}
              spec={{ ...spec, ...paramText(t, part.id, spec) }}
              value={params[spec.key]}
              onChange={(value) => updateParam(projectId, slot, block.id, spec.key, value)}
            />
          ))}
        </div>
      )}
    </li>
  )
}

interface BlockListProps {
  project: TaskProject
  slot: SlotId
  lookup: PartLookup
  issues: Issue[]
}

export function BlockList({ project, slot, lookup, issues }: BlockListProps) {
  const t = useT()
  const moveBlock = useStudio((s) => s.moveBlock)
  const addBlock = useStudio((s) => s.addBlock)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const blocks = project.blocks[slot]
  const takenRoles = new Set(
    blocks.filter((b) => !b.disabled).flatMap((b) => lookup(b.partId)?.role ?? []),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = blocks.findIndex((b) => b.id === active.id)
    const to = blocks.findIndex((b) => b.id === over.id)
    if (from >= 0 && to >= 0) moveBlock(project.id, slot, from, to)
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-8 text-body-sm text-ink-muted">
          {t.studio.blocks.empty} {sectionText(t, slot).hint}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-4">
              {blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  projectId={project.id}
                  slot={slot}
                  block={block}
                  lookup={lookup}
                  issues={issues.filter((i) => i.blockId === block.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <PartPicker slot={slot} takenRoles={takenRoles} onAdd={(part) => addBlock(project.id, slot, part)} />
    </div>
  )
}
