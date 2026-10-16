import { describe, expect, it } from "vitest"

import { parseBrowseMode } from "@/lib/browse"

describe("parseBrowseMode", () => {
  it("reads carousel", () => {
    expect(parseBrowseMode("carousel")).toBe("carousel")
  })

  it("falls back to list for a missing or unknown value", () => {
    expect(parseBrowseMode(undefined)).toBe("list")
    expect(parseBrowseMode(null)).toBe("list")
    expect(parseBrowseMode("")).toBe("list")
    expect(parseBrowseMode("grid")).toBe("list")
  })
})
