"use client"

import { ArrowLeft, FileCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useT } from "@/i18n/provider"

import { SECTIONS, sectionText, type SectionKey } from "../slots"

interface FrameProps {
  part: SectionKey
  wide: boolean
  onBack: () => void
  onViewSource: () => void
  /** What you change, on the left. */
  editor: React.ReactNode
  /** What changes as you do, on the right. */
  live: React.ReactNode
}

/**
 * The second layer: one part of the task, with a way back to the blueprint
 * and a way down to its source. Edit on the left, see the effect on the
 * right; on a narrow screen the effect sits below.
 */
export function WorkbenchFrame({ part, wide, onBack, onViewSource, editor, live }: FrameProps) {
  const t = useT()
  const { label, hint } = sectionText(t, part)
  const Icon = SECTIONS[part].icon

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5 lg:px-6">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label={t.workbench.backLabel}>
          <ArrowLeft />
          {t.workbench.back}
        </Button>
        <span aria-hidden className="h-5 w-px bg-line" />
        <h2 className="flex min-w-0 items-baseline gap-2 font-semibold">
          <Icon className="size-4 shrink-0 translate-y-0.5 self-start text-ink-muted" aria-hidden />
          {label}
          <span className="font-mono text-code font-normal text-ink-muted">{SECTIONS[part].target}</span>
        </h2>
        <p className="hidden min-w-0 flex-1 truncate text-body-sm text-ink-muted xl:block" title={hint}>
          {hint}
        </p>
        <Button variant="outline" size="sm" className="ml-auto" onClick={onViewSource}>
          <FileCode />
          {t.workbench.viewSource}
        </Button>
      </div>

      {wide ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="54" minSize={420}>
            {/* A plain scroll container: Radix ScrollArea sizes its content to the widest line. */}
            <div className="h-full overflow-y-auto">
              <div className="min-w-0 p-6 lg:p-8">{editor}</div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="46" minSize={340} className="bg-surface-sunken">
            <div className="h-full overflow-y-auto">
              <div className="min-w-0 p-4 lg:p-6">{live}</div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-w-0 flex-col gap-8 p-4">
            {editor}
            <div className="-mx-4 border-t border-line bg-surface-sunken p-4">{live}</div>
          </div>
        </div>
      )}
    </div>
  )
}
