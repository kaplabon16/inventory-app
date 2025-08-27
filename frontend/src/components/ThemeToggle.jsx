import { useTranslation } from 'react-i18next'
import { useUI } from '../store/ui'

export default function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useUI()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="px-3 py-1 rounded border text-sm"
      title={t('theme')}
    >
      {theme === 'dark' ? t('light') : t('dark')}
    </button>
  )
}
