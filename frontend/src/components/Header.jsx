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

  const baseButton = "inline-flex items-center justify-center h-10 min-w-[3rem] px-4 text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
  const primaryButton = `${baseButton} bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:ring-indigo-400 dark:bg-indigo-400 dark:text-black dark:hover:bg-indigo-300`
  const accentButton = `${baseButton} bg-emerald-500 text-white hover:bg-emerald-400 focus-visible:ring-emerald-300 dark:bg-emerald-400 dark:text-black dark:hover:bg-emerald-300`
  const outlineButton = `${baseButton} border border-indigo-500 text-indigo-600 hover:bg-indigo-50 focus-visible:ring-indigo-300 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-500/10`

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
          className="w-full rounded-l-lg border border-indigo-200 bg-white px-3 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 dark:border-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-gray-100"
        />
        <button
          type="submit"
          className="flex items-center justify-center h-10 min-w-[3rem] rounded-r-lg bg-indigo-500 px-3 text-white transition-colors hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 dark:bg-indigo-400 dark:text-black dark:hover:bg-indigo-300"
          aria-label={t("search")}
          title={t("search")}
        >
          🔎
        </button>
      </div>
    </form>
  )

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-[#1b1b1b] dark:bg-black/90">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">{t("app")}</Link>

        <nav className="items-center hidden gap-3 ml-2 text-sm lg:flex">
          <Link to="/inventories" className={outlineButton}>
            {t("inventories")}
          </Link>
        </nav>

        <SearchForm className="flex-1 hidden max-w-xl ml-3 lg:block" />

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`${outlineButton} ml-auto lg:hidden`}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <div className="items-center hidden gap-2 ml-auto lg:flex">
          <button
            onClick={() => setOpenTicket(true)}
            className={accentButton}
            title="Create support ticket"
          >
            Help
          </button>

          {!user ? (
            <>
              <Link to="/login" className={primaryButton}>
                {t("login")}
              </Link>
              <Link to="/register" className={outlineButton}>
                {t("register")}
              </Link>
            </>
          ) : (
            <>
              <button onClick={()=>navigate("/profile")} className={primaryButton}>
                {t("profile")}
              </button>
              {isAdmin && (
                <button onClick={()=>navigate('/admin')} className={outlineButton}>
                  {t("admin")}
                </button>
              )}
              <button onClick={logout} className={accentButton}>
                {t("logout")}
              </button>
            </>
          )}
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="px-4 pb-4 border-t border-gray-200 dark:border-[#1b1b1b] lg:hidden bg-white/95 dark:bg-black">
          <nav className="flex flex-col gap-2 pt-3 text-sm">
            <Link
              to="/inventories"
              className={outlineButton}
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
              className={`${accentButton} justify-start`}
            >
              Help
            </button>

            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={primaryButton}
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className={outlineButton}
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
                  className={`${primaryButton} justify-start`}
                >
                  {t("profile")}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className={`${outlineButton} justify-start`}
                  >
                    {t("admin")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className={`${accentButton} justify-start`}
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
