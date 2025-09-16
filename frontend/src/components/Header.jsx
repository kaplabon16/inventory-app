import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"
import SupportTicketModal from "./SupportTicketModal"

const iconProps = {
  className: "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
}

const InventoryIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />
  </svg>
)

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.24V13" />
    <circle cx="12" cy="16.5" r=".75" fill="currentColor" stroke="none" />
  </svg>
)

const UserIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    <path d="M4 19a8 8 0 0 1 16 0" />
  </svg>
)

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="m12 3 1.2 2.4 2.7.4-2 1.9.5 2.7-2.4-1.2-2.4 1.2.5-2.7-2-1.9 2.7-.4L12 3Z" />
    <path d="m6 13 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L2.8 15 5 14.9 6 13Zm12 0 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2Z" />
  </svg>
)

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M15.75 7.5v-1A2.5 2.5 0 0 0 13.25 4h-6.5A2.5 2.5 0 0 0 4.25 6.5v11A2.5 2.5 0 0 0 6.75 20h6.5a2.5 2.5 0 0 0 2.5-2.5v-1" />
    <path d="M19.5 12h-9" />
    <path d="m16.5 9 3 3-3 3" />
  </svg>
)

const LoginIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M8.25 7.5v-1A2.5 2.5 0 0 1 10.75 4h6.5A2.5 2.5 0 0 1 19.75 6.5v11A2.5 2.5 0 0 1 17.25 20h-6.5a2.5 2.5 0 0 1-2.5-2.5v-1" />
    <path d="M4.5 12h9" />
    <path d="m7.5 9-3 3 3 3" />
  </svg>
)

const RegisterIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    <path d="M4 19a8 8 0 0 1 12-7" />
    <path d="M20 10v6" />
    <path d="M23 13h-6" />
  </svg>
)

const MenuIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    {open ? (
      <path d="m6 6 12 12M6 18 18 6" />
    ) : (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    )}
  </svg>
)

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

  const headerButton = "icon-btn"
  const accentButton = "icon-btn icon-btn--accent"
  const dangerButton = "icon-btn icon-btn--danger"

  const SearchForm = ({ className }) => (
    <form onSubmit={onSubmit} className={className}>
      <label className="sr-only" htmlFor="global-search">{t("search")}</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          inputMode="search"
          placeholder={`${t("search")} (Ctrl/Cmd+K)`}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="w-full rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 dark:border-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-gray-100"
        />
        <button
          type="submit"
          className={headerButton}
          aria-label={t("search")}
          title={t("search")}
        >
          <svg viewBox="0 0 24 24" {...iconProps}>
            <circle cx="11" cy="11" r="6" />
            <path d="m16.5 16.5 3 3" />
          </svg>
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
