import { useState, useMemo } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"

export default function Header() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const url = new URLSearchParams(location.search)
  const [term, setTerm] = useState(url.get("q") || "")

  const isAdmin = useMemo(
    () => (user?.roles || []).map(r => r.toLowerCase()).includes('admin'),
    [user]
  )

  const onSubmit = (e) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold tracking-tight">{t("app")}</Link>

        <form onSubmit={onSubmit} className="flex-1 max-w-xl ml-3">
          <label className="sr-only" htmlFor="global-search">{t("search")}</label>
          <div className="flex">
            <input
              id="global-search"
              type="search"
              inputMode="search"
              placeholder={t("search")}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("search")} title={t("search")}>🔎</button>
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {!user ? (
            <Link to="/login" className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              {t("login")}
            </Link>
          ) : (
            <>
              <Link to="/profile" className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">{t("profile")}</Link>
              {isAdmin && (
                <Link to="/admin" className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">Admin</Link>
              )}
              <button onClick={logout} className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t("logout")}
              </button>
            </>
          )}
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </header>
  )
}
