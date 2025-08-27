import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../store/auth"
import ThemeToggle from "./ThemeToggle"
import LangToggle from "./LangToggle"
import { useTranslation } from "react-i18next"

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-100 shadow dark:bg-gray-800">
      {/* Left: Brand */}
      <Link to="/" className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t("app")}
      </Link>

      {/* Right: Nav + Toggles */}
      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <Link to="/profile" className="text-gray-900 dark:text-gray-100 hover:underline">
              {t("profile")}
            </Link>
            {user.roles?.includes("admin") && (
              <Link to="/admin" className="text-gray-900 dark:text-gray-100 hover:underline">
                {t("admin")}
              </Link>
            )}
            <button onClick={handleLogout} className="text-gray-900 dark:text-gray-100 hover:underline">
              {t("logout")}
            </button>
          </>
        ) : (
          <Link to="/login" className="text-gray-900 dark:text-gray-100 hover:underline">
            {t("login")}
          </Link>
        )}

        {/* Icon toggles */}
        <ThemeToggle />
        <LangToggle />
      </nav>
    </header>
  )
}
