// frontend/src/components/Header.jsx
import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"

export default function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Keep search value in sync with current ?q=
  const url = new URLSearchParams(location.search)
  const [term, setTerm] = useState(url.get("q") || "")

  const goLogin = () => navigate("/login")
  const goProfile = () => navigate("/profile")

  const onSubmit = (e) => {
    e.preventDefault()
    const q = term.trim()
    // Always navigate to /search?q=...
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        {/* Brand */}
        <Link to="/" className="text-xl font-semibold tracking-tight">
          {t("app")}
        </Link>

        {/* Global Search (always visible) */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl ml-3">
          <label className="sr-only" htmlFor="global-search">
            {t("search")}
          </label>
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
              <Link
                to="/inventories"
                className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("inventories")}
              </Link>
              <button
                onClick={goProfile}
                className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("profile")}
              </button>
              <LogoutButton />
            </>
          )}

          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </header>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  return (
    <button
      onClick={logout}
      className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      Logout
    </button>
  )
}
