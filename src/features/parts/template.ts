import { compileChecks, compileSteps } from "@/features/flow/compile"
import { isFlowValue } from "@/features/flow/types"

import type { ParamValue } from "./types"

/**
 * A deliberately small, logic-less template language for part manifests.
 * Third-party parts are data, not code, so this is all they can do:
 *
 *   {{name}}                    value (lists join with spaces)
 *   {{name|lines}}              list joined with newlines
 *   {{name|quote}}              POSIX single-quoted
 *   {{name|json}}               JSON-encoded
 *   {{flow|checks-script}}      a list of checks as the verifier's bash (features/flow)
 *   {{flow|steps-script}}       a list of steps as the solution's bash
 *   {{#if name}}…{{else}}…{{/if}}   truthy: non-empty string/list/map, true, non-zero
 *   {{#unless name}}…{{/unless}}
 *   {{#each name}}…{{.}}…{{/each}}  over a list; {{@key}} {{.}} over a map
 */

export type TemplateScope = Record<string, ParamValue | undefined>

const FILTERS: Record<string, (value: ParamValue | undefined) => string> = {
  lines: (v) => (Array.isArray(v) ? v.join("\n") : str(v)),
  quote: (v) => `'${str(v).replace(/'/g, `'\\''`)}'`,
  json: (v) => JSON.stringify(v ?? null),
  "checks-script": (v) => (isFlowValue(v) ? compileChecks(v.nodes, { mode: v.reward }) : compileChecks([])),
  "steps-script": (v) => (isFlowValue(v) ? compileSteps(v.nodes) : compileSteps([])),
}

function str(value: ParamValue | undefined): string {
  if (value === undefined) return ""
  if (Array.isArray(value)) return value.join(" ")
  if (isFlowValue(value)) return ""
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
  }
  return String(value)
}

export function isTruthy(value: ParamValue | undefined): boolean {
  if (value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (isFlowValue(value)) return value.nodes.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return value !== 0
  return value
}

type Node =
  | { kind: "text"; text: string }
  | { kind: "var"; name: string; filter?: string }
  | { kind: "if"; name: string; negate: boolean; then: Node[]; else: Node[] }
  | { kind: "each"; name: string; body: Node[] }

const TAG = /\{\{\s*([#/]?)([^}]*?)\s*\}\}/g

function parseTemplate(template: string): Node[] {
  const root: Node[] = []
  const stack: { node: Node | null; children: Node[] }[] = [
    { node: null, children: root },
  ]
  let last = 0
  for (const match of template.matchAll(TAG)) {
    const top = stack[stack.length - 1]
    if (match.index > last) {
      top.children.push({ kind: "text", text: template.slice(last, match.index) })
    }
    last = match.index + match[0].length
    const [, sigil, body] = match
    const [head, ...rest] = body.trim().split(/\s+/)
    const arg = rest.join(" ")

    if (sigil === "#") {
      let node: Node
      if (head === "if" || head === "unless") {
        node = { kind: "if", name: arg, negate: head === "unless", then: [], else: [] }
        stack.push({ node, children: node.then })
      } else if (head === "each") {
        node = { kind: "each", name: arg, body: [] }
        stack.push({ node, children: node.body })
      } else {
        throw new Error(`Unknown block {{#${head}}}`)
      }
      top.children.push(node)
    } else if (sigil === "/") {
      const open = stack.pop()
      const expected = open?.node?.kind === "each" ? "each" : ["if", "unless"]
      if (!open?.node || !([] as string[]).concat(expected).includes(head)) {
        throw new Error(`Unexpected {{/${head}}}`)
      }
    } else if (head === "else") {
      const open = top.node
      if (open?.kind !== "if") throw new Error("{{else}} outside {{#if}}")
      top.children = open.else
    } else {
      const [name, filter] = body.trim().split("|").map((s) => s.trim())
      if (filter && !(filter in FILTERS)) throw new Error(`Unknown filter |${filter}`)
      top.children.push({ kind: "var", name, filter })
    }
  }
  if (stack.length > 1) throw new Error("Unclosed block in template")
  if (last < template.length) root.push({ kind: "text", text: template.slice(last) })
  return root
}

function renderNodes(nodes: Node[], scope: TemplateScope): string {
  let out = ""
  for (const node of nodes) {
    if (node.kind === "text") out += node.text
    else if (node.kind === "var") {
      const value = scope[node.name]
      out += node.filter ? FILTERS[node.filter](value) : str(value)
    } else if (node.kind === "if") {
      const truthy = isTruthy(scope[node.name]) !== node.negate
      out += renderNodes(truthy ? node.then : node.else, scope)
    } else {
      const value = scope[node.name]
      if (Array.isArray(value)) {
        for (const item of value) out += renderNodes(node.body, { ...scope, ".": item })
      } else if (value && typeof value === "object" && !isFlowValue(value)) {
        for (const [key, item] of Object.entries(value)) {
          out += renderNodes(node.body, { ...scope, ".": item, "@key": key })
        }
      }
    }
  }
  return out
}

const cache = new Map<string, Node[]>()

export function renderTemplate(template: string, scope: TemplateScope): string {
  let nodes = cache.get(template)
  if (!nodes) {
    nodes = parseTemplate(template)
    cache.set(template, nodes)
  }
  return renderNodes(nodes, scope)
}

/** Throws with a readable message if the template does not parse. */
export function checkTemplate(template: string): void {
  parseTemplate(template)
}

const WHOLE_VAR = /^\{\{\s*([\w@.]+)\s*\}\}$/

/** If the string is exactly one {{name}} tag, return that name. */
export function wholeVariable(template: string): string | undefined {
  return WHOLE_VAR.exec(template)?.[1]
}
