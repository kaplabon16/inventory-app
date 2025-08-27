// frontend/src/api/client.js
import axios from 'axios'

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

// Always hit full paths like `/api/auth/login`
const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // <- REQUIRED for cross-site cookies
  headers: { 'Content-Type': 'application/json' },
})

// Optional: simple error wrapper
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Surface the server message if present
    const msg = err?.response?.data?.message || err?.message || 'Request failed'
    console.error('API error:', msg, err?.response?.data || '')
    return Promise.reject(err)
  }
)

export default api
