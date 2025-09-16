
import { useTranslation } from "react-i18next"

export default function LangToggle({ className = "" }) {
  const { i18n } = useTranslation()
  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }
  return (
    <button
      onClick={switchLanguage}
      className={`btn-plain inline-flex items-center justify-center h-10 min-w-[3rem] px-3 text-sm font-semibold rounded-lg shadow-sm bg-rose-500 text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-400 dark:bg-rose-400 dark:text-black dark:hover:bg-rose-300 ${className}`.trim()}
      aria-label="Toggle language"
      title={i18n.language.toUpperCase()}
    >
      {i18n.language.toUpperCase()}
    </button>
  )
}
