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
import {
  File as FileIcon,
  FileCheck,
  FilePen,
  FilePlus,
  FileSearch,
  FileX,
  Folder,
  FolderPlus,
  GripVertical,
  Plus,
  SquareTerminal,
  Terminal,
  Trash2,
  X,
} from "lucide-react"
import { useId, useState, type ComponentType } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createNode,
  KINDS,
  kindDef,
  nodeIssues,
  type FieldDef,
  type FlowKind,
  type FlowNode,
  type FlowValue,
  type RewardMode,
} from "@/features/flow/types"
import { useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

import { nodeTitle } from "./node-title"

const KIND_ICON: Record<string, ComponentType<{ className?: string }>> = {
  "file-exists": FileIcon,
  "dir-exists": Folder,
  "file-absent": FileX,
  "file-equals": FileCheck,
  "file-contains": FileSearch,
  "command-succeeds": Terminal,
  "command-output": SquareTerminal,
  "write-file": FilePen,
  "append-file": FilePlus,
  "make-dir": FolderPlus,
  delete: Trash2,
  "run-command": Terminal,
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

interface FieldProps {
  def: FieldDef
  node: FlowNode
  flow: FlowKind
  listId: string
  onChange: (key: string, value: string | boolean) => void
}

function NodeField({ def, node, flow, listId, onChange }: FieldProps) {
  const t = useT()
  const id = useId()
  const label = t.flow.fields[def.key] ?? def.key
  const value = node[def.key]
  const problems = nodeIssues(flow, node).filter((i) => i.field === def.key)

  const control =
    def.type === "boolean" ? null : def.type === "text" || def.type === "command" ? (
      <Textarea
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        rows={2}
        spellCheck={false}
        placeholder={def.type === "command" ? t.editor.node.commandPlaceholder : t.editor.node.textPlaceholder}
        className="min-h-16 font-mono text-code"
      />
    ) : (
      <Input
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(def.key, e.target.value)}
        spellCheck={false}
        list={def.type === "path" ? listId : undefined}
        placeholder={def.type === "path" ? t.editor.node.pathPlaceholder : t.editor.node.textPlaceholder}
        className={cn(def.type === "path" && "font-mono text-code")}
      />
    )

  return (
    <div className="flex flex-col gap-1.5">
      {def.type === "boolean" ? (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={id}>{capitalize(label)}</Label>
          <Switch id={id} checked={value !== false} onCheckedChange={(on) => onChange(def.key, on)} />
        </div>
      ) : (
        <Label htmlFor={id}>{capitalize(label)}</Label>
      )}
      {control}
      {problems.map((p) => (
        <p key={p.problem} className="text-body-sm text-warn">
          {t.flow.problems[p.problem](label)}
        </p>
      ))}
    </div>
  )
}

interface NodeCardProps {
  node: FlowNode
  index: number
  flow: FlowKind
  weighted: boolean
  listId: string
  status?: React.ReactNode
  note?: React.ReactNode
  onChange: (node: FlowNode) => void
  onRemove: () => void
}

function NodeCard({ node, index, flow, weighted, listId, status, note, onChange, onRemove }: NodeCardProps) {
  const t = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const [naming, setNaming] = useState(false)
  const def = kindDef(flow, node.kind)
  const Icon = KIND_ICON[node.kind] ?? FileIcon
  const title = nodeTitle(t, flow, node)
  const kindName = t.flow.kinds[node.kind as keyof typeof t.flow.kinds]?.name ?? node.kind
  const set = (key: string, value: string | boolean) => onChange({ ...node, [key]: value })
  const hasName = typeof node.label === "string" && node.label !== ""

  return (
    <li
      ref={setNodeRef}
      id={`node-${node.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative pb-3 pl-11", isDragging && "z-10")}
    >
      <span
        aria-hidden
        className="absolute top-3 left-0 flex size-7 items-center justify-center rounded-full border border-line-strong bg-surface font-mono text-code tabular-nums"
      >
        {index + 1}
      </span>
      <div className={cn("rounded-xl border border-line bg-surface", isDragging && "shadow-drag")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2.5">
          <button
            type="button"
            className="cursor-grab touch-none rounded-sm text-ink-muted"
            aria-label={t.editor.node.drag(title)}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="min-w-[8rem] flex-1 truncate font-semibold" title={t.flow.kinds[node.kind as keyof typeof t.flow.kinds]?.hint}>
            {kindName}
          </span>
          {status}
          {weighted && (
            <label className="flex items-center gap-1.5 text-body-sm text-ink-muted">
              {t.editor.checks.reward.weight}
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={typeof node.weight === "number" ? node.weight : 1}
                onChange={(e) => onChange({ ...node, weight: Math.max(1, Math.floor(Number(e.target.value)) || 1) })}
                className="h-8 w-16 px-2 text-center tabular-nums"
              />
            </label>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t.editor.node.remove(title)}>
            <X />
          </Button>
        </div>
        {def && (
          <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
            {def.fields.map((field) => (
              <NodeField key={field.key} def={field} node={node} flow={flow} listId={listId} onChange={set} />
            ))}
            {hasName || naming ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${node.id}-name`}>{t.editor.node.name}</Label>
                <Input
                  id={`${node.id}-name`}
                  value={typeof node.label === "string" ? node.label : ""}
                  placeholder={t.editor.node.namePlaceholder}
                  autoFocus={naming && !hasName}
                  onChange={(e) => onChange({ ...node, label: e.target.value })}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="self-start rounded-sm text-body-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                {t.editor.node.addName}
              </button>
            )}
            {!def.simulable && <p className="text-body-sm text-ink-muted">{t.editor.node.needsRun}</p>}
          </div>
        )}
        {note && <div className="border-t border-line px-3 py-2.5 text-body-sm">{note}</div>}
      </div>
    </li>
  )
}

function Terminal_({ label, filled = false }: { label: string; filled?: boolean }) {
  return (
    <div className="relative flex min-h-7 items-center pb-3 pl-11">
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-[7px] size-3.5 rounded-full border-2 border-ink",
          filled ? "bg-ink" : "bg-paper",
        )}
      />
      <span className="text-body-sm font-medium text-ink-muted">{label}</span>
    </div>
  )
}

export interface FlowEditorProps {
  kind: FlowKind
  value: FlowValue
  onChange: (value: FlowValue) => void
  /** Live result chips for a node, from the simulator. */
  status?: (node: FlowNode, index: number) => React.ReactNode
  /** A note under a node, such as a warning about it. */
  note?: (node: FlowNode, index: number) => React.ReactNode
  /** Paths to offer while typing a path. */
  pathSuggestions?: string[]
  /** Leave out the start and end markers, for a flow shown inside something else. */
  bare?: boolean
}

/**
 * A flow as a pipeline: numbered nodes down a rail, from where the run
 * starts to the reward (checks) or the end of solve.sh (steps). Nodes are
 * added from a menu and dragged into order; each shows its own live result.
 */
export function FlowEditor({ kind, value, onChange, status, note, pathSuggestions = [], bare = false }: FlowEditorProps) {
  const t = useT()
  const listId = useId()
  const copy = kind === "checks" ? t.editor.checks : t.editor.steps
  const weighted = kind === "checks" && value.reward === "weighted"
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setNodes = (nodes: FlowNode[]) => onChange({ ...value, nodes })

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = value.nodes.findIndex((n) => n.id === active.id)
    const to = value.nodes.findIndex((n) => n.id === over.id)
    if (from >= 0 && to >= 0) setNodes(arrayMove(value.nodes, from, to))
  }

  const addable = KINDS[kind]
  const groups = [
    { key: "files" as const, kinds: addable.filter((k) => k.simulable) },
    { key: "commands" as const, kinds: addable.filter((k) => !k.simulable) },
  ].filter((g) => g.kinds.length > 0)

  const start = kind === "checks" ? t.editor.checks.start : t.editor.steps.start
  const empty = value.nodes.length === 0

  return (
    <div className="relative">
      <span aria-hidden className="absolute top-2 bottom-4 left-[13.5px] w-px bg-line-strong" />
      {pathSuggestions.length > 0 && (
        <datalist id={listId}>
          {pathSuggestions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      )}
      {!bare && <Terminal_ label={start} />}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <ol>
            {value.nodes.map((node, index) => (
              <NodeCard
                key={node.id}
                node={node}
                index={index}
                flow={kind}
                weighted={weighted}
                listId={listId}
                status={status?.(node, index)}
                note={note?.(node, index)}
                onChange={(next) => setNodes(value.nodes.map((n) => (n.id === node.id ? next : n)))}
                onRemove={() => setNodes(value.nodes.filter((n) => n.id !== node.id))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="relative pb-3 pl-11">
        <span
          aria-hidden
          className="absolute top-1.5 left-0 flex size-7 items-center justify-center rounded-full border border-dashed border-line-strong bg-paper text-ink-muted"
        >
          <Plus className="size-4" />
        </span>
        {empty && <p className="mb-2 max-w-prose pt-1 text-body-sm text-ink-muted">{copy.empty}</p>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={empty ? "default" : "outline"} size="sm">
              <Plus />
              {copy.add}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {groups.map((group, i) => (
              <DropdownMenuGroup key={group.key}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{t.editor.groups[group.key]}</DropdownMenuLabel>
                {group.kinds.map((k) => {
                  const Icon = KIND_ICON[k.kind] ?? FileIcon
                  const text = t.flow.kinds[k.kind as keyof typeof t.flow.kinds]
                  return (
                    <DropdownMenuItem key={k.kind} onSelect={() => setNodes([...value.nodes, createNode(kind, k.kind)])}>
                      <Icon className="size-4 text-ink-muted" />
                      <span className="flex flex-col">
                        <span>{text.name}</span>
                        <span className="text-body-sm text-ink-muted">{text.hint}</span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!bare &&
        (kind === "checks" ? (
          <div className="relative pl-11">
            <span aria-hidden className="absolute top-3 left-[7px] size-3.5 rounded-full border-2 border-ink bg-ink" />
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
              <Label>{t.editor.checks.reward.title}</Label>
              <Select value={value.reward ?? "all"} onValueChange={(mode) => onChange({ ...value, reward: mode as RewardMode })}>
                <SelectTrigger className="w-full" aria-label={t.editor.checks.reward.mode}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.editor.checks.reward.all}</SelectItem>
                  <SelectItem value="weighted">{t.editor.checks.reward.weighted}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <Terminal_ label={t.editor.steps.end} filled />
        ))}
    </div>
  )
}
