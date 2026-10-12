import { describe, expect, it } from "vitest"

import { parseTheme } from "@/lib/theme"

describe("parseTheme", () => {
  it("reads dark", () => {
    expect(parseTheme("dark")).toBe("dark")
  })

  it("falls back to light for a missing or unknown value", () => {
    expect(parseTheme(undefined)).toBe("light")
    expect(parseTheme(null)).toBe("light")
    expect(parseTheme("")).toBe("light")
    expect(parseTheme("purple")).toBe("light")
  })
})
