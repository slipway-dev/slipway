import { describe, expect, it } from "vitest"

import { cleanNewPath, uploadPaths } from "../new-file-dialog"

describe("cleanNewPath", () => {
  it("drops leading slashes and refuses folders and ..", () => {
    expect(cleanNewPath("/tests/a.py")).toBe("tests/a.py")
    expect(cleanNewPath("tests/")).toBeUndefined()
    expect(cleanNewPath("tests/../x")).toBeUndefined()
  })
})

describe("uploadPaths", () => {
  it("puts picked files in the typed folder", () => {
    expect(uploadPaths("tests/", ["reference.jpg", "weights.pt"])).toEqual(["tests/reference.jpg", "tests/weights.pt"])
    expect(uploadPaths("tests/data/x.txt", ["a.csv", "b.csv"])).toEqual(["tests/data/a.csv", "tests/data/b.csv"])
  })

  it("uses the typed path for a single file", () => {
    expect(uploadPaths("environment/input.csv", ["export.csv"])).toEqual(["environment/input.csv"])
  })
})
