// frontend/src/api/client.js
import axios from 'axios'

// Accept either:
// - VITE_API_BASE = https://your-backend.example.com   (preferred)
// - VITE_API_BASE = https://your-backend.example.com/api (we'll trim /api)
function normalizeOrigin(raw) {
  const fallback = 'http://localhost:3000'
  const base = (raw || fallback).replace(/\/+$/, '')
  return base.endsWith('/api') ? base.slice(0, -4) : base
}

const ORIGIN = normalizeOrigin(import.meta.env.VITE_API_BASE)
const API_BASE = ORIGIN + '/api'

const api = axios.create({
  baseURL: API_BASE,        // e.g. https://inventoryapp-app.up.railway.app/api
  withCredentials: true,    // send/receive cookies cross-site
})

// Optional helper for absolute URLs (used by a few places)
export const apiUrl = (path = '') => {
  const p = String(path || '')
  // If caller already passed /api/... keep it; otherwise prefix /api
  return ORIGIN + (p.startsWith('/api') ? p : `/api${p.startsWith('/') ? p : `/${p}`}`)
}

// Optional legacy helper – we use cookies, but keep this for compatibility
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

if (typeof window !== 'undefined') {
  console.log('[api] origin =', ORIGIN, '| baseURL =', api.defaults.baseURL)
}

export { ORIGIN, API_BASE }
export default api
