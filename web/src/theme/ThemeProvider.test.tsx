import { describe, expect, it } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { ThemeProvider, useTheme } from "./ThemeProvider"

describe("ThemeProvider", () => {
  it("toggles between light and dark themes", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    })

    expect(["light", "dark"]).toContain(result.current.theme)

    const initialTheme = result.current.theme
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).not.toBe(initialTheme)
  })
})
