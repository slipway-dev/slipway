import { strToU8, zipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { decodeText, fromBase64, ImportBudget, safeRelativePath, toBase64, unzipWithin } from "../safe-files"

const LIMITS = { maxFileBytes: 1024, maxTotalBytes: 4096, maxFiles: 10 }

describe("safeRelativePath", () => {
  it("normalizes ordinary paths", () => {
    expect(safeRelativePath("task/./tests//test.sh")).toBe("task/tests/test.sh")
    expect(safeRelativePath("task\\environment\\Dockerfile")).toBe("task/environment/Dockerfile")
  })

  it("rejects paths that could escape a folder", () => {
    for (const bad of ["../etc/passwd", "a/../../b", "/etc/passwd", "C:/Windows/x", "c:\\x", "a\u0000b", "", "./"]) {
      expect(safeRelativePath(bad), JSON.stringify(bad)).toBeUndefined()
    }
  })
})

describe("ImportBudget", () => {
  it("skips oversized files, ignored folders and anything past the limits", () => {
    const budget = new ImportBudget(LIMITS)
    expect(budget.admit("ok.txt", 10)).toBe("ok.txt")
    expect(budget.admit("big.bin", 2048)).toBeUndefined()
    expect(budget.admit("repo/.git/objects/ab", 10)).toBeUndefined()
    expect(budget.admit("node_modules/x/index.js", 10)).toBeUndefined()
    expect(budget.admit("../escape", 10)).toBeUndefined()
    for (let i = 0; i < 3; i++) expect(budget.admit(`f${i}`, 1024)).toBe(`f${i}`)
    expect(budget.admit("over-total", 1024)).toBeUndefined()
    expect(budget.skipped.map((s) => s.reason)).toEqual(["larger than 0 MB", "unsafe path", "import over 0 MB"])
  })

  it("caps the number of files", () => {
    const budget = new ImportBudget({ ...LIMITS, maxFiles: 2 })
    expect(["a", "b", "c"].map((p) => budget.admit(p, 1))).toEqual(["a", "b", undefined])
  })
})

describe("unzipWithin", () => {
  it("refuses a zip bomb before inflating it", () => {
    // 50 MB of zeros compresses to about 50 KB.
    const zip = zipSync({ "bomb.bin": new Uint8Array(50 * 1024 * 1024), "ok.txt": strToU8("fine") }, { level: 9 })
    expect(zip.byteLength).toBeLessThan(200_000)
    const budget = new ImportBudget(LIMITS)
    const files = unzipWithin(zip, budget, LIMITS)
    expect([...files.keys()]).toEqual(["ok.txt"])
    expect(budget.skipped).toEqual([{ path: "bomb.bin", reason: "larger than 0 MB" }])
  })

  it("drops entries with unsafe names", () => {
    const zip = zipSync({ "../../evil.sh": strToU8("x"), "/abs.txt": strToU8("x"), "task/task.toml": strToU8("") })
    const budget = new ImportBudget(LIMITS)
    expect([...unzipWithin(zip, budget, LIMITS).keys()]).toEqual(["task/task.toml"])
    expect(budget.skipped.map((s) => s.path).sort()).toEqual(["../../evil.sh", "/abs.txt"])
  })
})

describe("text and bytes", () => {
  it("tells text from binary and round-trips bytes through base64", () => {
    expect(decodeText(strToU8("héllo\n"))).toBe("héllo\n")
    expect(decodeText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1]))).toBeUndefined()
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41]))).toBeUndefined()
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 31) % 256)
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})
