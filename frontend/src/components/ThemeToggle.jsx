import { useEffect } from "react"
import { useUI } from "../store/ui"
import { useTranslation } from "react-i18next"

export default function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useUI()

useEffect(() => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  localStorage.setItem("theme", theme)
}, [theme])

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-3 py-1 ml-2 border rounded dark:border-gray-500"
    >
      {theme === "dark" ? t("Light Mode") : t("Dark Mode")}
    </button>
  )
}
