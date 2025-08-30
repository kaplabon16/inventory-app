// src/components/LangToggle.jsx
import { useTranslation } from "react-i18next"

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const next = i18n.language === "en" ? "bn" : "en"
  const click = () => i18n.changeLanguage(next)
  return (
    <button
      onClick={click}
      className="px-3 py-1 text-gray-800 bg-gray-200 border rounded dark:bg-gray-700 dark:text-gray-100"
      aria-label="Toggle language"
      title={i18n.language.toUpperCase()}
    >
      {i18n.language.toUpperCase()}
    </button>
  )
}
