
import { useTranslation } from "react-i18next"

export default function LangToggle() {
  const { i18n } = useTranslation()
  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }
  return (
    <button
      onClick={switchLanguage}
      className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle language"
      title={i18n.language.toUpperCase()}
    >
      {i18n.language.toUpperCase()}
    </button>
  )
}
