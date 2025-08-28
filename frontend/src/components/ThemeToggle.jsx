import { useEffect, useState } from "react"

/**
 * Minimal theme toggle for Tailwind v4.
 * - Adds/removes `dark` on <html>
 * - Persists to localStorage
 * - Uses moon/sun icons
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "dark") return true
    if (saved === "light") return false
    return window.matchMedia?.matches && window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="p-2 transition rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {dark ? (
        // Sun
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="currentColor" d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.8l1.8-1.8zm10.48 0l1.8-1.79l1.79 1.79l-1.79 1.8l-1.8-1.8zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 13H1v-2h3v2zm19 0h-3v-2h3v2zM6.76 19.16l-1.8 1.8l-1.79-1.8l1.79-1.79l1.8 1.79zm10.48 0l1.8 1.8l1.79-1.8l-1.79-1.79l-1.8 1.79zM12 18a6 6 0 1 1 0-12a6 6 0 0 1 0 12z"/>
        </svg>
      ) : (
        // Moon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="currentColor" d="M20.742 13.045a8.001 8.001 0 0 1-9.787-9.787A9 9 0 1 0 20.742 13.045z"/>
        </svg>
      )}
    </button>
  )
}