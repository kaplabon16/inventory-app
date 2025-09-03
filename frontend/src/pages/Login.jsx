import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import api from "../api/client"
import { useAuth } from "../store/auth"

export default function Login() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, loadMe } = useAuth()

  const sp = new URLSearchParams(loc.search)
  const redirect = sp.get("redirect") || "/profile"


  const API = (import.meta.env.VITE_API_BASE || "")
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {

    if (user) nav(redirect, { replace: true })
  }, [user, redirect, nav])

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    try {
      await api.post("/api/auth/login", { email, password })
      await loadMe()
      nav(redirect, { replace: true })
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Login failed. Please check your credentials."
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md p-6 mx-auto">
      <h1 className="mb-3 text-2xl font-semibold">Sign in</h1>

      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span>Email</span>
          <input
            type="email"
            className="px-2 py-1 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="grid gap-1">
          <span>Password</span>
          <input
            type="password"
            className="px-2 py-1 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 border rounded disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6">
        <div className="mb-2 text-sm text-gray-500">Or continue with</div>
        <div className="space-y-2">
          <a
            className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            href={`${API}/api/auth/google?redirect=${encodeURIComponent(redirect)}`}
          >
            Continue with Google
          </a>
          <a
            className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            href={`${API}/api/auth/github?redirect=${encodeURIComponent(redirect)}`}
          >
            Continue with GitHub
          </a>
        </div>
      </div>

      <div className="mt-6 text-sm">
        Don’t have an account?{" "}
        <Link
          className="text-blue-600 hover:underline"
          to={`/register?redirect=${encodeURIComponent(redirect)}`}
        >
          Create one
        </Link>
      </div>
    </div>
  )
}
