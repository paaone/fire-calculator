import { useTheme } from "./ThemeProvider"
import { FaMoon, FaSun } from "react-icons/fa6"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  return (
    <button className="btn btn-secondary btn-sm" type="button" onClick={toggleTheme} aria-label="Toggle theme">
      {isDark ? (
        <span className="hstack" style={{ gap: 6 }}>
          <FaSun />
          Light
        </span>
      ) : (
        <span className="hstack" style={{ gap: 6 }}>
          <FaMoon />
          Dark
        </span>
      )}
    </button>
  )
}
