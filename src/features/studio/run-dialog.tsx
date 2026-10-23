"use client"

import { Bot, ChevronDown, Copy } from "lucide-react"
import { useId } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AGENTS, DEFAULT_AGENT, agentInfo, requiredKeys, runCommand, type AgentGroup } from "@/features/harbor/agents"
import type { RunChoice, TaskProject } from "@/features/task/model"
import { useStudio } from "@/features/task/store"
import { useT } from "@/i18n/provider"

const GROUPS: AgentGroup[] = ["cli", "harness", "reference"]

/** The run's agent, model and options; the dialog writes the commands, keys stay in the user's shell. */
export function RunDialog({ project, dirName }: { project: TaskProject; dirName: string }) {
  const t = useT()
  const r = t.studio.run
  const id = useId()
  const updateProject = useStudio((s) => s.updateProject)
  const choice: RunChoice = project.run ?? { agent: DEFAULT_AGENT }
  const info = agentInfo(choice.agent)
  const set = (patch: Partial<RunChoice>) =>
    updateProject(project.id, (p) => void (p.run = { ...(p.run ?? { agent: DEFAULT_AGENT }), ...patch }))

  const keys = requiredKeys(choice.agent, choice.model ?? info?.model)
  const prebuilt = typeof project.config.environment?.docker_image === "string" && !!project.config.environment.docker_image
  const command = runCommand({ dir: dirName, ...choice, forceBuild: prebuilt && choice.forceBuild })
  const script = [...keys.map((k) => `export ${k}=…`), command].join("\n")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5" title={r.title}>
          <Bot />
          <span className="max-w-32 truncate">{info?.label ?? choice.agent}</span>
          <ChevronDown className="opacity-60" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{r.title}</DialogTitle>
          <DialogDescription>{r.lede}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-agent`}>{r.agent}</Label>
            <Select value={choice.agent} onValueChange={(agent) => set({ agent })}>
              <SelectTrigger id={`${id}-agent`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {GROUPS.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{r.groups[group]}</SelectLabel>
                    {AGENTS.filter((a) => a.group === group).map((a) => (
                      <SelectItem key={a.name} value={a.name}>
                        <span>{a.label}</span>
                        <code className="ml-auto pl-3 text-label text-ink-muted">{a.name}</code>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {info?.group === "reference" && <p className="text-body-sm text-ink-muted">{r.referenceNote}</p>}
          </div>

          {info?.usesModel !== false && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-model`}>{r.model}</Label>
              <Input
                id={`${id}-model`}
                value={choice.model ?? ""}
                placeholder={info?.model ?? "provider/model"}
                className="font-mono text-code"
                onChange={(e) => set({ model: e.target.value || undefined })}
              />
              <p className="text-body-sm text-ink-muted">{r.modelHelp}</p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-6">
            <div className="flex w-32 flex-col gap-2">
              <Label htmlFor={`${id}-k`}>{r.attempts}</Label>
              <Input
                id={`${id}-k`}
                type="number"
                min={1}
                max={50}
                value={choice.attempts ?? 1}
                onChange={(e) => set({ attempts: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
              />
            </div>
            {prebuilt && (
              <label className="flex items-center gap-2 pb-2 text-body-sm">
                <Switch checked={!!choice.forceBuild} onCheckedChange={(forceBuild) => set({ forceBuild })} />
                {r.forceBuild}
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label text-ink-muted">{r.command}</span>
            <div className="flex items-start gap-2 rounded-xl bg-hull p-4 text-hull-ink">
              <pre className="min-w-0 flex-1 text-code break-all whitespace-pre-wrap">
                {keys.map((k) => (
                  <span key={k} className="block text-hull-muted">
                    export {k}=…
                  </span>
                ))}
                <span className="block">{command}</span>
              </pre>
              <button
                type="button"
                aria-label={t.common.copyCommand}
                className="rounded-sm p-0.5 text-hull-muted hover:text-hull-ink"
                onClick={() => {
                  void navigator.clipboard.writeText(script)
                  toast.success(t.common.copied)
                }}
              >
                <Copy className="size-4" />
              </button>
            </div>
            <p className="text-body-sm text-ink-muted">{keys.length ? r.keysNote : r.noKeys}</p>
          </div>
        </div>

        <DialogFooter>
          <p className="mr-auto self-center text-label text-ink-muted">{r.afterLaunch(`${dirName}.zip`)}</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
