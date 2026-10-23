import { describe, expect, it } from "vitest"

import { validateManifest } from "../manifest"
import { BUILTIN_PARTS } from "../registry"
import { checkTemplate, renderTemplate, wholeVariable } from "../template"

describe("renderTemplate", () => {
  it("substitutes values and joins lists with spaces", () => {
    expect(renderTemplate("FROM {{image}}", { image: "ubuntu:24.04" })).toBe("FROM ubuntu:24.04")
    expect(renderTemplate("apt install {{pkgs}}", { pkgs: ["curl", "git"] })).toBe(
      "apt install curl git",
    )
  })

  it("applies filters", () => {
    expect(renderTemplate("{{xs|lines}}", { xs: ["a", "b"] })).toBe("a\nb")
    expect(renderTemplate("bash -c {{c|quote}}", { c: "echo 'hi'" })).toBe(
      `bash -c 'echo '\\''hi'\\'''`,
    )
    expect(renderTemplate("{{v|json}}", { v: 'a"b' })).toBe('"a\\"b"')
  })

  it("handles if/else/unless", () => {
    const t = "{{#if w}}WORKDIR {{w}}{{else}}none{{/if}}"
    expect(renderTemplate(t, { w: "/app" })).toBe("WORKDIR /app")
    expect(renderTemplate(t, { w: "  " })).toBe("none")
    expect(renderTemplate("{{#unless on}}off{{/unless}}", { on: false })).toBe("off")
  })

  it("iterates lists and maps", () => {
    expect(renderTemplate("{{#each xs}}--with {{.}} {{/each}}", { xs: ["a", "b"] })).toBe(
      "--with a --with b ",
    )
    expect(renderTemplate("{{#each m}}{{@key}}={{.|quote}};{{/each}}", { m: { A: "1" } })).toBe(
      "A='1';",
    )
  })

  it("rejects malformed templates", () => {
    expect(() => checkTemplate("{{#if x}}open")).toThrow(/Unclosed/)
    expect(() => checkTemplate("{{/each}}")).toThrow(/Unexpected/)
    expect(() => checkTemplate("{{x|shout}}")).toThrow(/Unknown filter/)
    expect(() => checkTemplate("{{#each x}}{{/if}}")).toThrow(/Unexpected/)
  })

  it("detects whole-variable strings", () => {
    expect(wholeVariable("{{ cpus }}")).toBe("cpus")
    expect(wholeVariable("x{{cpus}}")).toBeUndefined()
  })
})

describe("validateManifest", () => {
  it("accepts every built-in part", () => {
    for (const part of BUILTIN_PARTS) {
      expect(validateManifest(part), part.id).toEqual([])
    }
  })

  it("rejects unsafe or malformed parts", () => {
    const errors = validateManifest({
      id: "Bad Id",
      version: "1",
      name: "x",
      summary: "x",
      slot: "verifier",
      params: [{ key: "a", label: "A", type: "enum" }, { key: "a", label: "A", type: "string" }],
      contributes: {
        dockerfile: [{ section: "base", template: "FROM x" }],
        files: [
          { path: "../escape", template: "" },
          { path: "task.toml", template: "" },
          { path: "tests/{{#if}}", template: "" },
        ],
      },
    })
    expect(errors.join("\n")).toMatch(/id must look like/)
    expect(errors.join("\n")).toMatch(/options is required for enum/)
    expect(errors.join("\n")).toMatch(/duplicated/)
    expect(errors.join("\n")).toMatch(/only environment parts/)
    expect(errors.join("\n")).toMatch(/must not contain \.\./)
    expect(errors.join("\n")).toMatch(/written by Slipway/)
    expect(errors.join("\n")).toMatch(/Unclosed/)
  })
})
