"use client"

import { Sparkles, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isFlowValue, type FlowKind, type FlowValue } from "@/features/flow/types"
import type { PartLookup } from "@/features/parts/registry"
import { partsForSlot } from "@/features/parts/registry"
import type { TaskFile } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import type { TaskSimulation } from "@/features/task/simulate"
import { useStudio } from "@/features/task/store"
import { useT } from "@/i18n/provider"
import { partText } from "@/i18n/text"

import { BlockList } from "../block-list"
import { GeneratedFiles } from "../generated-files"
import type { Selection } from "../slots"
import { FlowEditor } from "./flow-editor"
import { CheckBadges, StepBadge } from "./live"
import { pathSuggestions } from "./paths"
import { SimulationPanel } from "./simulation-panel"

type FlowSlot = "verifier" | "solution"

/** Per slot: the role whose part decides the outcome, the flow part Slipway builds, and the flow it holds. */
const SLOT: Record<FlowSlot, { role: string; flowPart: string; kind: FlowKind; dir: string }> = {
  verifier: { role: "runner", flowPart: "slipway/checks", kind: "checks", dir: "tests/" },
  solution: { role: "solver", flowPart: "slipway/solution-steps", kind: "steps", dir: "solution/" },
}

interface BenchProps {
  slot: FlowSlot
  project: TaskProject
  lookup: PartLookup
  issues: Issue[]
}

function findRunner(project: TaskProject, slot: FlowSlot, lookup: PartLookup) {
  return project.blocks[slot].find((b) => !b.disabled && lookup(b.partId)?.role === SLOT[slot].role)
}

/** Nothing decides the outcome yet: offer each way to do it, with the visual one first. */
function RunnerChooser({ slot, project }: Pick<BenchProps, "slot" | "project">) {
  const t = useT()
  const customParts = useStudio((s) => s.customParts)
  const addBlock = useStudio((s) => s.addBlock)
  const { role, flowPart } = SLOT[slot]
  const options = partsForSlot(slot, customParts)
    .filter((p) => p.role === role)
    .sort((a, b) => Number(b.id === flowPart) - Number(a.id === flowPart))
  const copy = slot === "verifier" ? [t.workbench.chooseVerifier, t.workbench.chooseVerifierHelp] : [t.workbench.chooseSolution, t.workbench.chooseSolutionHelp]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold">{copy[0]}</h3>
        <p className="max-w-prose text-body-sm text-ink-muted">{copy[1]}</p>
      </div>
      <ul className="grid gap-3">
        {options.map((part) => {
          const text = partText(t, part)
          return (
            <li key={part.id}>
              <button
                type="button"
                onClick={() => addBlock(project.id, slot, part)}
                className="flex w-full flex-col items-start gap-1.5 rounded-xl border border-line-strong bg-surface p-4 text-left hover:border-ink"
              >
                <span className="flex items-center gap-2 font-semibold">
                  {text.name}
                  {part.id === flowPart && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="size-3" aria-hidden />
                      {t.workbench.recommended}
                    </Badge>
                  )}
                </span>
                <span className="text-body-sm text-ink-muted">{text.summary}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The left side: the flow as a pipeline, or the parts that stand in for it. */
export function FlowEditorPane({ slot, project, lookup, issues, simulation }: BenchProps & { simulation: TaskSimulation }) {
  const t = useT()
  const updateParam = useStudio((s) => s.updateBlockParam)
  const removeBlock = useStudio((s) => s.removeBlock)
  const [confirming, setConfirming] = useState(false)
  const { flowPart, kind } = SLOT[slot]
  const runner = findRunner(project, slot, lookup)

  if (!runner) return <RunnerChooser slot={slot} project={project} />

  if (runner.partId !== flowPart) {
    return <BlockList project={project} slot={slot} lookup={lookup} issues={issues} />
  }

  const copy = kind === "checks" ? t.editor.checks : t.editor.steps
  const value: FlowValue = isFlowValue(runner.params.flow) ? runner.params.flow : { nodes: [] }
  const oracle = simulation.runs.find((r) => r.id === "oracle")
  const nop = simulation.runs.find((r) => r.id === "nop")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{copy.title}</h3>
            <p className="max-w-prose text-body-sm text-ink-muted">{copy.lede}</p>
          </div>
          {confirming ? (
            <span className="flex shrink-0 items-center gap-2 text-body-sm">
              {t.editor.options.changeConfirm}
              <Button size="xs" variant="destructive" onClick={() => removeBlock(project.id, slot, runner.id)}>
                {t.common.delete}
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setConfirming(true)}>
              {t.editor.options.change}
            </Button>
          )}
        </div>

        <FlowEditor
          kind={kind}
          value={value}
          pathSuggestions={pathSuggestions(project, simulation)}
          onChange={(next) => updateParam(project.id, slot, runner.id, "flow", next)}
          status={(node) =>
            kind === "checks" ? (
              <CheckBadges
                oracle={oracle?.checks.find((c) => c.id === node.id)}
                nop={nop?.checks.find((c) => c.id === node.id)}
              />
            ) : (
              <StepBadge result={oracle?.steps.find((s) => s.id === node.id)} />
            )
          }
          note={(node) =>
            kind === "checks" && nop?.checks.find((c) => c.id === node.id)?.status === "pass" ? (
              <p className="flex items-start gap-2 text-warn">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t.editor.checks.leak}
              </p>
            ) : null
          }
        />
      </div>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="text-label text-ink-muted">{t.workbench.otherParts}</h3>
        <BlockList project={project} slot={slot} lookup={lookup} issues={issues} exclude={runner.id} quietWhenEmpty />
      </section>
    </div>
  )
}

/** The right side: what the simulator makes of it, and the script it writes. */
export function FlowLivePane({
  slot,
  project,
  simulation,
  files,
  dirName,
  onSelect,
}: {
  slot: FlowSlot
  project: TaskProject
  simulation: TaskSimulation
  files: TaskFile[]
  dirName: string
  onSelect: (selection: Selection) => void
}) {
  const t = useT()
  const mine = files.filter((f) => f.path.startsWith(SLOT[slot].dir))
  return (
    <Tabs defaultValue={simulation.supported ? "sim" : "files"} className="h-full gap-4">
      <TabsList>
        <TabsTrigger value="sim">{t.sim.title}</TabsTrigger>
        <TabsTrigger value="files">{t.studio.generated}</TabsTrigger>
      </TabsList>
      <TabsContent value="sim">
        <SimulationPanel
          project={project}
          simulation={simulation}
          dirName={dirName}
          pathSuggestions={pathSuggestions(project, simulation)}
        />
      </TabsContent>
      <TabsContent value="files" className="min-h-96">
        <GeneratedFiles files={mine} onSelect={onSelect} />
      </TabsContent>
    </Tabs>
  )
}
