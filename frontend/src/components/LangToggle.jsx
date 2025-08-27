import i18n from '../i18n'
import { useUI } from '../store/ui'

export default function LangToggle() {
  const { lang, setLang } = useUI()
  const toggle = () => {
    const next = lang === 'en' ? 'bn' : 'en'
    i18n.changeLanguage(next)
    setLang(next)
  }
  return (
    <button onClick={toggle} className="px-3 py-1 rounded border text-sm">
      {lang === 'en' ? 'বাংলা' : 'EN'}
    </button>
  )
}
