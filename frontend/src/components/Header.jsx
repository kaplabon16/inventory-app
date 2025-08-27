import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"

export default function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const API = import.meta.env.VITE_API_BASE?.replace(/\/$/, "")

  const goLogin = () => navigate("/login")
  const goProfile = () => navigate("/profile")

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex items-center max-w-6xl gap-3 px-4 py-3 mx-auto">
        <Link to="/" className="text-xl font-semibold">{t("app")}</Link>

        <div className="flex items-center gap-2 ml-auto">
          {!user ? (
            <button
              onClick={goLogin}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {t("login")}
            </button>
          ) : (
            <button
              onClick={goProfile}
              className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {t("profile")}
            </button>
          )}

          <ThemeToggle />
          <LangToggle />

          {/* Direct OAuth links (hit /api/auth/...) */}
          {!user && (
            <div className="hidden">
              {/* keep handy if you need anchor links instead of /login page */}
              <a href={`${API}/api/auth/google`}>Google</a>
              <a href={`${API}/api/auth/github`}>GitHub</a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
