"use client"

import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ParamSpec, ParamValue } from "@/features/parts/types"
import { useT } from "@/i18n/provider"

import { CodeEditor } from "./code-editor"

function parseList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseMap(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const i = line.indexOf("=")
    if (i <= 0) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}

function formatList(value: ParamValue | undefined): string {
  return Array.isArray(value) ? value.join("\n") : ""
}

function formatMap(value: ParamValue | undefined): string {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : ""
}

/**
 * Lists and maps are edited as text, one entry per line. The text is kept
 * locally so typing a newline is not undone by re-formatting the parsed value.
 */
function LineEntries({
  id,
  value,
  onChange,
  format,
  parse,
  placeholder,
}: {
  id: string
  value: ParamValue | undefined
  onChange: (value: ParamValue) => void
  format: (value: ParamValue | undefined) => string
  parse: (text: string) => ParamValue
  placeholder?: string
}) {
  const [text, setText] = useState(() => format(value))
  const external = format(value)
  if (external !== format(parse(text))) setText(external)
  return (
    <Textarea
      id={id}
      value={text}
      rows={Math.min(8, Math.max(2, text.split("\n").length + 1))}
      placeholder={placeholder}
      className="font-mono text-code"
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
    />
  )
}

interface ParamFieldProps {
  spec: ParamSpec
  value: ParamValue | undefined
  onChange: (value: ParamValue | undefined) => void
}

export function ParamField({ spec, value, onChange }: ParamFieldProps) {
  const t = useT()
  const id = useId()
  const describedBy = spec.description ? `${id}-desc` : undefined

  let control: React.ReactNode
  switch (spec.type) {
    case "boolean":
      return (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={id}>{spec.label}</Label>
            {spec.description && (
              <p id={describedBy} className="text-body-sm text-ink-muted">
                {spec.description}
              </p>
            )}
          </div>
          <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} aria-describedby={describedBy} />
        </div>
      )
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={typeof value === "number" ? value : ""}
          placeholder={spec.placeholder ?? t.common.notSet}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      )
      break
    case "enum":
      control = (
        <Select value={typeof value === "string" ? value : undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full" aria-describedby={describedBy}>
            <SelectValue placeholder={t.common.choose} />
          </SelectTrigger>
          <SelectContent>
            {spec.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break
    case "text":
      control = (
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          placeholder={spec.placeholder}
          aria-describedby={describedBy}
          className="font-mono text-code"
          onChange={(e) => onChange(e.target.value)}
        />
      )
      break
    case "code":
      control = (
        <CodeEditor
          label={spec.label}
          value={typeof value === "string" ? value : ""}
          language={spec.language}
          minHeight="120px"
          onChange={onChange}
        />
      )
      break
    case "list":
      control = (
        <LineEntries
          id={id}
          value={value}
          onChange={onChange}
          format={formatList}
          parse={parseList}
          placeholder={spec.placeholder ? `${spec.placeholder}\n${t.studio.params.onePerLineSuffix}` : t.studio.params.onePerLine}
        />
      )
      break
    case "map":
      control = (
        <LineEntries
          id={id}
          value={value}
          onChange={onChange}
          format={formatMap}
          parse={parseMap}
          placeholder={t.studio.params.mapPlaceholder}
        />
      )
      break
    default:
      control = (
        <>
          <Input
            id={id}
            value={typeof value === "string" ? value : ""}
            placeholder={spec.placeholder}
            list={spec.suggestions ? `${id}-suggestions` : undefined}
            aria-describedby={describedBy}
            className="font-mono text-code"
            onChange={(e) => onChange(e.target.value)}
          />
          {spec.suggestions && (
            <datalist id={`${id}-suggestions`}>
              {spec.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {spec.label}
        {spec.required && <span className="sr-only"> {t.studio.params.required}</span>}
      </Label>
      {control}
      {spec.description && (
        <p id={describedBy} className="text-body-sm text-ink-muted">
          {spec.description}
        </p>
      )}
    </div>
  )
}
