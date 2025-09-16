import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"
import SupportTicketModal from "./SupportTicketModal"

export default function Header() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const url = new URLSearchParams(location.search)
  const [term, setTerm] = useState(url.get("q") || "")
  const inputRef = useRef(null)
  const [openTicket, setOpenTicket] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    const q = term.trim()
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') ||
          (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  const isAdmin = !!user?.roles?.includes('ADMIN')

  const SearchForm = ({ className }) => (
    <form onSubmit={onSubmit} className={className}>
      <label className="sr-only" htmlFor="global-search">{t("search")}</label>
      <div className="flex">
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          inputMode="search"
          placeholder={`${t("search")} (Ctrl/Cmd+K)`}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("search")} title={t("search")}>🔎</button>
      </div>
    </form>
  )

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold tracking-tight">{t("app")}</Link>

        <nav className="items-center hidden gap-3 ml-2 text-sm lg:flex">
          <Link to="/inventories" className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            {t("inventories")}
          </Link>
        </nav>

        <SearchForm className="hidden flex-1 max-w-xl ml-3 lg:block" />

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="px-3 py-1.5 ml-auto border rounded lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? t("close") : t("menu")}
        </button>

        <div className="items-center hidden gap-2 ml-auto lg:flex">
          <button
            onClick={() => setOpenTicket(true)}
            className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Create support ticket"
          >
            Help
          </button>

          {!user ? (
            <>
              <Link to="/login" className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t("login")}
              </Link>
              <Link to="/register" className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t("register")}
              </Link>
            </>
          ) : (
            <>
              <button onClick={()=>navigate("/profile")} className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t("profile")}
              </button>
              {isAdmin && (
                <button onClick={()=>navigate('/admin')} className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t("admin")}
                </button>
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

      {menuOpen && (
        <div id="mobile-menu" className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 lg:hidden">
          <nav className="flex flex-col gap-2 pt-3 text-sm">
            <Link
              to="/inventories"
              className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMenuOpen(false)}
            >
              {t("inventories")}
            </Link>
          </nav>

          <SearchForm className="mt-3" />

          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={() => {
                setMenuOpen(false)
                setOpenTicket(true)
              }}
              className="px-3 py-1.5 border rounded text-left hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Help
            </button>

            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("register")}
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    navigate("/profile")
                  }}
                  className="px-3 py-1.5 border rounded text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("profile")}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className="px-3 py-1.5 border rounded text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t("admin")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="px-3 py-1.5 border rounded text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t("logout")}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      )}

      <SupportTicketModal open={openTicket} onClose={()=>setOpenTicket(false)} />
    </header>
  )
}
