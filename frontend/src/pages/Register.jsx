import { useState } from "react"
import api, { apiUrl } from "../api/client"
import { useNavigate } from "react-router-dom"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    try {
      await api.post(apiUrl("/auth/register"), { name, email, password })
      // after register, send to login so they can sign in
      navigate("/login")
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed")
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full px-3 py-2 bg-white border rounded dark:bg-gray-900"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full px-3 py-2 bg-white border rounded dark:bg-gray-900"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full px-3 py-2 bg-white border rounded dark:bg-gray-900"
          placeholder="Password"
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          Register
        </button>
      </form>
    </div>
  )
}
