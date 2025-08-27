import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import ThemeToggle from './ThemeToggle'
import LangToggle from './LangToggle'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function Header() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-3 py-2 flex gap-3 items-center">
        <Link to="/" className="font-semibold text-lg">📦 {t('app')}</Link>
        <form onSubmit={(e)=>{e.preventDefault(); nav(`/search?q=${encodeURIComponent(q)}`)}} className="flex-1">
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder={`${t('search')}…`}
            className="w-full rounded border px-3 py-1"/>
        </form>
        <div className="flex gap-2">
          <ThemeToggle/>
          <LangToggle/>
          {user ? (
            <>
              {user.roles?.includes('ADMIN') && <Link to="/admin" className="px-3 py-1 border rounded text-sm">{t('admin')}</Link>}
              <Link to="/me" className="px-3 py-1 border rounded text-sm">{t('profile')}</Link>
              <button onClick={logout} className="px-3 py-1 border rounded text-sm">{t('logout')}</button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1 border rounded text-sm">{t('login')}</Link>
          )}
        </div>
      </div>
    </header>
  )
}
