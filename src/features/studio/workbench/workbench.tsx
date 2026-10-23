"use client"

import type { PartLookup } from "@/features/parts/registry"
import type { TaskFile } from "@/features/task/compose"
import type { Issue } from "@/features/task/issues"
import type { TaskProject } from "@/features/task/model"
import type { TaskSimulation } from "@/features/task/simulate"

import { BlockList } from "../block-list"
import { GeneratedFiles } from "../generated-files"
import { SettingsForm } from "../settings-form"
import type { SectionKey, Selection } from "../slots"
import { FlowEditorPane, FlowLivePane } from "./flow-bench"
import { WorkbenchFrame } from "./frame"
import { EnvironmentLivePane, InstructionEditorPane, InstructionLivePane } from "./simple-benches"

interface WorkbenchProps {
  part: SectionKey
  project: TaskProject
  files: TaskFile[]
  issues: Issue[]
  simulation: TaskSimulation
  lookup: PartLookup
  dirName: string
  wide: boolean
  onBack: () => void
  /** Go down a layer: to a file, or to a part's own source. */
  onSource: (selection: Selection) => void
}

/** The file to show when someone asks for a part's source. */
export function sourceFor(part: SectionKey, files: TaskFile[]): Selection {
  const first = (prefix: string) => files.find((f) => f.path.startsWith(prefix))?.path
  const path =
    part === "settings"
      ? "task.toml"
      : part === "instruction"
        ? "instruction.md"
        : part === "environment"
          ? (files.find((f) => f.path === "environment/Dockerfile")?.path ?? first("environment/"))
          : part === "verifier"
            ? (files.find((f) => f.path === "tests/test.sh")?.path ?? first("tests/"))
            : (files.find((f) => f.path === "solution/solve.sh")?.path ?? first("solution/"))
  return path && path !== "instruction.md" ? { kind: "file", path } : { kind: "instruction" }
}

/**
 * The second layer: each part of the task with its own editor and a live
 * view of what it does. Verifier and solution are flows you build from
 * checks and steps; the rest are the part stack, the instruction and the
 * task settings.
 */
export function Workbench({ part, project, files, issues, simulation, lookup, dirName, wide, onBack, onSource }: WorkbenchProps) {
  const frame = (editor: React.ReactNode, live: React.ReactNode) => (
    <WorkbenchFrame part={part} wide={wide} onBack={onBack} onViewSource={() => onSource(sourceFor(part, files))} editor={editor} live={live} />
  )

  switch (part) {
    case "instruction":
      return frame(<InstructionEditorPane project={project} />, <InstructionLivePane project={project} />)
    case "environment":
      return frame(
        <BlockList project={project} slot="environment" lookup={lookup} issues={issues} />,
        <EnvironmentLivePane files={files} simulation={simulation} onSelect={onSource} />,
      )
    case "verifier":
    case "solution":
      return frame(
        <FlowEditorPane slot={part} project={project} lookup={lookup} issues={issues} simulation={simulation} />,
        <FlowLivePane slot={part} project={project} simulation={simulation} files={files} dirName={dirName} onSelect={onSource} />,
      )
    case "settings":
      return frame(
        <SettingsForm project={project} />,
        <GeneratedFiles files={files.filter((f) => f.path === "task.toml")} onSelect={onSource} />,
      )
  }
}
