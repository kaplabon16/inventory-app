import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"
import SupportTicketModal from "./SupportTicketModal"

function HeaderSearchForm({
  className,
  onSubmit,
  inputRef,
  term,
  onTermChange,
  placeholder,
  label,
  inputId = "global-search"
}) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        inputMode="search"
        placeholder={placeholder}
        value={term}
        onChange={onTermChange}
        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 dark:border-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-gray-100"
      />
    </form>
  )
}

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

  const headerButtonBase = "btn-plain inline-flex items-center justify-center h-10 rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-[#111] dark:text-amber-300 dark:hover:bg-[#1a1a1a]"
  const headerButton = `${headerButtonBase} px-4 min-w-[3rem]`.trim()

  const handleTermChange = (e) => setTerm(e.target.value)
  const searchLabel = t("search")
  const placeholder = `${searchLabel} (Ctrl/Cmd+K)`

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-[#1b1b1b] dark:bg-black/90">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">{t("app")}</Link>

        <nav className="items-center hidden gap-3 ml-2 text-sm lg:flex">
          <Link to="/inventories" className={headerButton}>
            {t("inventories")}
          </Link>
        </nav>

        <HeaderSearchForm
          className="flex-1 hidden max-w-xl ml-3 lg:block"
          onSubmit={onSubmit}
          inputRef={inputRef}
          term={term}
          onTermChange={handleTermChange}
          placeholder={placeholder}
          label={searchLabel}
        />

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`${headerButton} ml-auto lg:hidden`}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <div className="items-center hidden gap-2 ml-auto lg:flex">
          {user && (
            <button
              onClick={() => setOpenTicket(true)}
              className={headerButton}
              title="Create support ticket"
            >
              Help
            </button>
          )}

          {!user ? (
            <>
              <Link to="/login" className={headerButton}>
                {t("login")}
              </Link>
              <Link to="/register" className={headerButton}>
                {t("register")}
              </Link>
            </>
          ) : (
            <>
              <button onClick={()=>navigate("/profile")} className={headerButton}>
                {t("profile")}
              </button>
              {isAdmin && (
                <button onClick={()=>navigate('/admin')} className={headerButton}>
                  {t("admin")}
                </button>
              )}
              <button onClick={logout} className={headerButton}>
                {t("logout")}
              </button>
            </>
          )}
          <ThemeToggle className="ml-1" />
          <LangToggle className="ml-1" baseClass={headerButtonBase} />
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="px-4 pb-4 border-t border-gray-200 dark:border-[#1b1b1b] lg:hidden bg-white/95 dark:bg-black">
          <nav className="flex flex-col gap-2 pt-3 text-sm">
            <Link
              to="/inventories"
              className={headerButton}
              onClick={() => setMenuOpen(false)}
            >
              {t("inventories")}
            </Link>
          </nav>

          <HeaderSearchForm
            className="mt-3"
            onSubmit={onSubmit}
            inputRef={inputRef}
            term={term}
            onTermChange={handleTermChange}
            placeholder={placeholder}
            label={searchLabel}
            inputId="global-search-mobile"
          />

          <div className="flex flex-col gap-2 mt-3">
            {user && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setOpenTicket(true)
                }}
                className={headerButton}
              >
                Help
              </button>
            )}

            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={headerButton}
                >
                  {t("login")}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className={headerButton}
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
                  className={headerButton}
                >
                  {t("profile")}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/admin')
                    }}
                    className={headerButton}
                  >
                    {t("admin")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className={headerButton}
                >
                  {t("logout")}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <ThemeToggle />
            <LangToggle baseClass={headerButtonBase} />
          </div>
        </div>
      )}

      <SupportTicketModal open={openTicket} onClose={()=>setOpenTicket(false)} />
    </header>
  )
}
