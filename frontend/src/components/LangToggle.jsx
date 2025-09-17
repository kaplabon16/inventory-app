
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export default function LangToggle({ className = "", baseClass }) {
  const { i18n } = useTranslation()

  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }

  const langCode = useMemo(() => (i18n.language || "en").toUpperCase(), [i18n.language])

  const defaultBase = "inline-flex items-center justify-center h-10 px-4 min-w-[3rem] text-sm font-semibold rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-700 transition-colors hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100 dark:hover:bg-blue-400/20"
  const buttonClass = `${baseClass || defaultBase} ${className}`.trim()

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
