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

  const headerButton = "btn btn-primary h-9 px-3 gap-2 text-xs uppercase tracking-wide"
  const outlineButton = headerButton

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
          className={`${headerButton} rounded-l-none rounded-r-lg`}
          aria-label={t("search")}
          title={t("search")}
        >
          <span aria-hidden="true" className="text-sm">🔍</span>
          <span className="sr-only">{t("search")}</span>
        </button>
      </div>
    </form>
  )

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-[#1b1b1b] dark:bg-black/90">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">{t("app")}</Link>

        <nav className="items-center hidden gap-2 ml-2 lg:flex">
          <Link to="/inventories" className={outlineButton}>
            <span aria-hidden="true">📦</span>
            <span>{t("inventories")}</span>
          </Link>
        </nav>

        <SearchForm className="flex-1 hidden max-w-xl ml-3 lg:block" />

        <div className="ml-auto lg:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={headerButton}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            <span className="sr-only">{menuOpen ? t("close") : t("menu")}</span>
          </button>
        </div>

        <div className="items-center hidden gap-2 ml-auto lg:flex">
          <button
            onClick={() => setOpenTicket(true)}
            className={headerButton}
            title="Create support ticket"
          >
            <span aria-hidden="true">🆘</span>
            <span>Help</span>
          </button>

          {!user ? (
            <>
              <Link to="/login" className={headerButton}>
                <span aria-hidden="true">🔑</span>
                <span>{t("login")}</span>
              </Link>
              <Link to="/register" className={headerButton}>
                <span aria-hidden="true">📝</span>
                <span>{t("register")}</span>
              </Link>
            </>
          ) : (
            <>
              <button onClick={()=>navigate("/profile")} className={headerButton}>
                <span aria-hidden="true">👤</span>
                <span>{t("profile")}</span>
              </button>
              {isAdmin && (
                <button onClick={()=>navigate('/admin')} className={headerButton}>
                  <span aria-hidden="true">🛠</span>
                  <span>{t("admin")}</span>
                </button>
              )}
              <button onClick={logout} className={headerButton}>
                <span aria-hidden="true">🚪</span>
                <span>{t("logout")}</span>
              </button>
            </>
          )}
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="px-4 pb-4 border-t border-gray-200 dark:border-[#1b1b1b] lg:hidden bg-white/95 dark:bg-black">
          <nav className="flex flex-col gap-2 pt-3 text-xs uppercase">
            <Link
              to="/inventories"
              className={`${headerButton} w-full justify-start`}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">📦</span>
              <span>{t("inventories")}</span>
            </Link>
          </nav>

          <SearchForm className="mt-3" />

          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={() => {
                setMenuOpen(false)
                setOpenTicket(true)
              }}
              className={`${headerButton} w-full justify-start`}
            >
              <span aria-hidden="true">🆘</span>
              <span>Help</span>
            </button>

            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`${headerButton} w-full justify-start`}
                >
                  <span aria-hidden="true">🔑</span>
                  <span>{t("login")}</span>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className={`${headerButton} w-full justify-start`}
                >
                  <span aria-hidden="true">📝</span>
                  <span>{t("register")}</span>
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    navigate("/profile")
                  }}
                  className={`${headerButton} w-full justify-start`}
                >
                  <span aria-hidden="true">👤</span>
                  <span>{t("profile")}</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className={`${headerButton} w-full justify-start`}
                  >
                    <span aria-hidden="true">🛠</span>
                    <span>{t("admin")}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className={`${headerButton} w-full justify-start`}
                >
                  <span aria-hidden="true">🚪</span>
                  <span>{t("logout")}</span>
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
