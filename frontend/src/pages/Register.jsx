import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../api/client"
import { useAuth } from "../store/auth"

export default function Register() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post("/auth/register", form)
      setUser(res.data.user)
      navigate("/profile")
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="mb-6 text-2xl font-bold text-center dark:text-white">
          Create Account
        </h2>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-sm text-center dark:text-gray-300">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
