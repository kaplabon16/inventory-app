
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export default function LangToggle({ className = "" }) {
  const { i18n } = useTranslation()

  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }

  const langCode = useMemo(() => (i18n.language || "en").toUpperCase(), [i18n.language])

  const buttonClass = `inline-flex items-center justify-center h-10 min-w-[3rem] px-5 text-sm font-semibold rounded-full shadow-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-300 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30 ${className}`.trim()

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
