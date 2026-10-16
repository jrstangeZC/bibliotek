import { describe, expect, it } from "vitest"

import { coverUrl } from "@/lib/covers"

describe("coverUrl", () => {
  it("looks a cover up by the ISBN without its hyphens", () => {
    expect(coverUrl("978-0-7475-3269-9", "L")).toBe(
      "https://covers.openlibrary.org/b/isbn/9780747532699-L.jpg?default=false"
    )
  })

  it("asks for the size it is given", () => {
    expect(coverUrl("9780747532699", "M")).toMatch(/-M\.jpg\?/)
  })

  it("keeps an ISBN-10 with an X check digit", () => {
    expect(coverUrl("0-8044-2957-x", "M")).toContain("/080442957X-M.jpg")
  })

  it("gives null for an ISBN that cannot be looked up", () => {
    expect(coverUrl("", "L")).toBeNull()
    expect(coverUrl("12345", "L")).toBeNull()
  })
})
