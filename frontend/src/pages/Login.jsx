import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../store/auth'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const API = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // If OAuth failed and redirected with ?err=google|github, show a message
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const e = p.get('err')
    if (e === 'google') setErr('Google sign-in failed or was cancelled. Please try again.')
    if (e === 'github') setErr('GitHub sign-in failed or was cancelled. Please try again.')
  }, [location.search])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setErr('Email and password are required.')
      return
    }

    try {
      setLoading(true)
      const { data } = await api.post('/api/auth/login', {
        email: trimmedEmail,
        password,
      })
      setUser(data)
      navigate('/')
    } catch (e) {
      const code = e?.response?.data?.error
      const msg =
        code === 'OAUTH_ONLY'
          ? 'This email is linked to Google/GitHub. Use social login below (or sign in with provider first, then set a password in your profile).'
          : e?.response?.data?.message ||
            (e?.response?.status === 400 ? 'Invalid email or password.' : 'Login failed. Please try again.')
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md p-6 mx-auto">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>

      {err && (
        <div className="p-3 mb-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full p-2 bg-white border rounded dark:bg-gray-900 dark:border-gray-700"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-2 bg-white border rounded dark:bg-gray-900 dark:border-gray-700"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full p-2 font-medium text-white bg-black rounded disabled:opacity-60 dark:bg-white dark:text-black"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {/* Top-level navigations so cookies can be set correctly during OAuth */}
        <a
          className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
          href={`${API}/api/auth/google`}
          target="_self"
        >
          Continue with Google
        </a>
        <a
          className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
          href={`${API}/api/auth/github`}
          target="_self"
        >
          Continue with GitHub
        </a>
      </div>

      <p className="mt-4 text-sm">
        No account?{' '}
        <Link className="underline" to="/register">
          Register
        </Link>
      </p>
    </div>
  )
}
