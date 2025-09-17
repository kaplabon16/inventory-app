
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export default function LangToggle({ className = "", baseClass }) {
  const { i18n } = useTranslation()

  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }

  const langCode = useMemo(() => (i18n.language || "en").toUpperCase(), [i18n.language])

  const defaultBase = "btn-plain inline-flex items-center justify-center h-10 rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-[#111] dark:text-amber-300 dark:hover:bg-[#1a1a1a]"
  const buttonClass = `${baseClass || defaultBase} px-4 min-w-[3rem] ${className}`.trim()

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className={buttonClass}
      aria-label="Toggle language"
      title={langCode}
    >
      {langCode === "BN" ? "BN" : "EN"}
    </button>
  )
}
