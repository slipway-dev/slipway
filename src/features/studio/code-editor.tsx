"use client"

import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language"
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { toml } from "@codemirror/legacy-modes/mode/toml"
import { yaml } from "@codemirror/legacy-modes/mode/yaml"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"
import CodeMirror, { type Extension } from "@uiw/react-codemirror"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

/**
 * Code always sits on `hull`, the brand's dark block, in both themes. The
 * syntax colors are the --hull-* accents, all at least 4.5:1 on hull.
 */
const hullTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--hull)",
      color: "var(--hull-ink)",
      fontSize: "13px",
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      lineHeight: "20px",
      caretColor: "var(--hull-signal)",
      padding: "12px 0",
    },
    ".cm-scroller": { fontFamily: "var(--font-mono)" },
    ".cm-gutters": {
      backgroundColor: "var(--hull)",
      color: "var(--hull-muted)",
      border: "none",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgba(233, 238, 241, 0.06)" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--hull-signal)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(92, 198, 196, 0.28) !important",
    },
  },
  { dark: true },
)

const hullHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.meta], color: "var(--hull-muted)", fontStyle: "italic" },
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: "var(--hull-signal)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--hull-pass)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--hull-warn)" },
  { tag: [t.function(t.variableName), t.definition(t.variableName), t.propertyName, t.attributeName], color: "var(--hull-tide)" },
  { tag: [t.heading, t.strong], color: "var(--hull-signal)", fontWeight: "700" },
  { tag: [t.link, t.url], color: "var(--hull-tide)", textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.monospace, color: "var(--hull-pass)" },
])

export function languageFor(path: string): string {
  const name = path.split("/").pop() ?? path
  if (name === "Dockerfile" || name.endsWith(".dockerfile")) return "dockerfile"
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return (
    { sh: "bash", bash: "bash", py: "python", md: "markdown", json: "json", toml: "toml", yaml: "yaml", yml: "yaml" }[
      ext
    ] ?? "text"
  )
}

function languageExtension(language: string): Extension[] {
  switch (language) {
    case "bash":
      return [StreamLanguage.define(shell)]
    case "python":
      return [python()]
    case "markdown":
      return [markdown()]
    case "json":
      return [json()]
    case "toml":
      return [StreamLanguage.define(toml)]
    case "yaml":
      return [StreamLanguage.define(yaml)]
    case "dockerfile":
      return [StreamLanguage.define(dockerFile)]
    default:
      return []
  }
}

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: string
  readOnly?: boolean
  className?: string
  minHeight?: string
  /** Accessible name; the editor has no visible label of its own. */
  label: string
  lineWrapping?: boolean
}

export function CodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  className,
  minHeight,
  label,
  lineWrapping = false,
}: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      ...languageExtension(language),
      hullTheme,
      syntaxHighlighting(hullHighlight),
      EditorView.contentAttributes.of({ "aria-label": label }),
      ...(lineWrapping ? [EditorView.lineWrapping] : []),
    ],
    [language, label, lineWrapping],
  )
  return (
    <div className={cn("overflow-hidden rounded-md bg-hull", className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        editable={!readOnly}
        theme="none"
        extensions={extensions}
        minHeight={minHeight}
        height="100%"
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: false,
        }}
      />
    </div>
  )
}
