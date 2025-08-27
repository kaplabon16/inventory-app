import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../store/auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [err,setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password })
      setUser(data)
      navigate('/')
    } catch (e) {
      setErr(e?.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="max-w-md p-6 mx-auto">
      <h1 className="mb-4 text-2xl font-semibold">Register</h1>
      {err && <div className="p-3 mb-3 text-red-700 bg-red-100 rounded">{err}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full p-2 border rounded" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full p-2 font-medium text-white bg-black rounded dark:bg-white dark:text-black">Create account</button>
      </form>
      <p className="mt-4 text-sm">
        Have an account? <Link className="underline" to="/login">Login</Link>
      </p>
    </div>
  )
}
