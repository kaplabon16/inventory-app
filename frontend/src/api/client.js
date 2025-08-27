import axios from 'axios'

// Ensure no trailing slash
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Helper to always prefix with /api
export const apiUrl = (path = '') =>
  `${BASE}/api${path.startsWith('/') ? path : `/${path}`}`

export default api
