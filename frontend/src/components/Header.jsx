// frontend/src/components/Header.jsx
import { useState, useEffect, useRef } from "react"
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

  // keep search synchronized with ?q=
  const url = new URLSearchParams(location.search)
  const [term, setTerm] = useState(url.get("q") || "")
  const inputRef = useRef(null)

  // "/" shortcut focuses global search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goLogin = () => navigate("/login")
  const goProfile = () => navigate("/profile")
  const goAdmin = () => navigate("/admin")

  const onSubmit = (e) => {
    e.preventDefault()
    const q = (term || "").trim()
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const isAdmin =
    !!user && (user.roles || []).some(r => String(r).toLowerCase() === 'admin')

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        {/* Brand */}
        <Link to="/" className="text-xl font-semibold tracking-tight">
          {t("app")}
        </Link>

        {/* Global Search */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl ml-3">
          <label className="sr-only" htmlFor="global-search">{t("search")}</label>
          <div className="flex">
            <input
              ref={inputRef}
              id="global-search"
              type="search"
              inputMode="search"
              placeholder={t("search")}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t("search")}
              title={t("search")}
            >
              🔎
            </button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {!user ? (
            <button
              onClick={goLogin}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {t("login")}
            </button>
          ) : (
            <>
              <button
                onClick={goProfile}
                className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("profile")}
              </button>
              {isAdmin && (
                <button
                  onClick={goAdmin}
                  className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Admin
                </button>
              )}
              <button
                onClick={logout}
                className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Logout
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
