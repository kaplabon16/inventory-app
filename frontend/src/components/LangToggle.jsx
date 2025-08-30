import { useTranslation } from "react-i18next"

export default function LangToggle() {
  const { i18n } = useTranslation()
  const toggle = () => i18n.changeLanguage(i18n.language === "en" ? "bn" : "en")
  return (
    <button
      onClick={toggle}
      className="px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle language"
      title="Toggle language"
    >
      {i18n.language.toUpperCase()}
    </button>
  )
}
