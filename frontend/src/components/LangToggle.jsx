import { useTranslation } from "react-i18next"

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const switchLanguage = () => {
    const next = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(next)
  }
  return (
    <button onClick={switchLanguage} className="px-3 py-1 text-gray-800 bg-gray-200 border rounded dark:bg-gray-700 dark:text-gray-100">
      {t("language")}: {i18n.language.toUpperCase()}
    </button>
  )
}

