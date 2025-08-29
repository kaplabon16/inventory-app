import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../store/auth'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const sp = new URLSearchParams(location.search)
  const redirect = sp.get('redirect') || '/'
  const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      setUser(data)
      navigate(redirect || '/')
    } catch (e) {
      const code = e?.response?.data?.error
      const msg =
        code === 'OAUTH_ONLY'
          ? 'This email is linked to Google/GitHub. Use social login or set a password after OAuth login.'
          : e?.response?.data?.message || 'Login failed'
      setErr(msg)
    }
  }

  // Build OAuth URLs that carry the redirect target via "state"
  const oauthUrl = (provider) => {
    const r = encodeURIComponent(redirect || '/')
    return `${API}/api/auth/${provider}?redirect=${r}`
  }

  useEffect(() => {
    // If we ever choose to drop params and use localStorage for redirect,
    // we'd read it here. For now, param is enough.
  }, [])

  return (
    <div className="max-w-md p-6 mx-auto">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>

      {err && <div className="p-3 mb-3 text-red-700 bg-red-100 rounded">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full p-2 font-medium text-white bg-black rounded dark:bg-white dark:text-black">Sign in</button>
      </form>

      <div className="mt-6 space-y-2">
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800" href={oauthUrl('google')}>Continue with Google</a>
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800" href={oauthUrl('github')}>Continue with GitHub</a>
      </div>

      <p className="mt-4 text-sm">
        No account? <Link className="underline" to={`/register?redirect=${encodeURIComponent(redirect)}`}>Register</Link>
      </p>
    </div>
  )
}
