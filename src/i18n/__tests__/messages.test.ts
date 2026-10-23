import { describe, expect, it } from "vitest"

import { BUILTIN_PARTS } from "@/features/parts/registry"
import { ISSUE_CODES, type Issue } from "@/features/task/issues"

import { negotiateLocale } from "../config"
import { getMessages } from "../messages"
import { zhParts } from "../messages/zh-parts"
import { issueText } from "../text"

describe("zh-parts", () => {
  it("translates every built-in part and parameter", () => {
    for (const part of BUILTIN_PARTS) {
      const entry = zhParts[part.id]
      expect(entry?.name, part.id).toBeTruthy()
      expect(entry?.summary, part.id).toBeTruthy()
      for (const spec of part.params) {
        // Labels that are file names (tests/test_outputs.py) stay as written.
        if (/[./]/.test(spec.label)) continue
        expect(entry?.params?.[spec.key]?.label, `${part.id} ${spec.key}`).toBeTruthy()
      }
    }
  })
})

describe("issueText", () => {
  it("uses translated part and parameter names", () => {
    const part = BUILTIN_PARTS.find((p) => p.params.length > 0)!
    const spec = part.params[0]
    const issue: Issue = {
      severity: "error",
      code: "missing-param",
      message: "English fallback",
      params: { part: part.name, partId: part.id, param: spec.label, paramKey: spec.key },
    }
    const zh = getMessages("zh")
    const text = issueText(zh, issue)
    expect(text).toContain(zhParts[part.id]!.name!)
    expect(text).toContain(zhParts[part.id]!.params![spec.key]!.label!)
  })

  it("has a message for every issue code in both languages", () => {
    for (const locale of ["en", "zh"] as const) {
      for (const code of ISSUE_CODES) {
        expect(typeof getMessages(locale).issues[code], `${locale} ${code}`).toBe("function")
      }
    }
  })
})

describe("negotiateLocale", () => {
  it("honors q-values and region tags", () => {
    expect(negotiateLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh")
    expect(negotiateLocale("en-US,zh;q=0.5")).toBe("en")
    expect(negotiateLocale("fr-FR,de;q=0.9")).toBe("en")
    expect(negotiateLocale(null)).toBe("en")
  })
})
