import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../store/auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    try {
      // Keep /api here — axios baseURL is origin only
      const { data } = await api.post('/api/auth/login', { email, password })
      const user = data?.user || data
      setUser(user)

      // If backend returned a token, do a top-level bounce to set cookie cross-site
      if (data?.token) {
        const next = window.location.origin
        window.location.href = `${API}/api/auth/bounce?token=${encodeURIComponent(data.token)}&next=${encodeURIComponent(next)}`
        return
      }

      navigate('/')
    } catch (e) {
      const code = e?.response?.data?.error
      const msg =
        code === 'OAUTH_ONLY'
          ? 'This email is linked to Google/GitHub. Use social login or set a password after OAuth login.'
          : e?.response?.data?.message || 'Login failed'
      setErr(msg)
    }
  }

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
        {/* Direct backend OAuth links — DO NOT add /api twice */}
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
           href={`${API}/api/auth/google`}>Continue with Google</a>
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
           href={`${API}/api/auth/github`}>Continue with GitHub</a>
      </div>

      <p className="mt-4 text-sm">
        No account? <Link className="underline" to="/register">Register</Link>
      </p>
    </div>
  )
}
