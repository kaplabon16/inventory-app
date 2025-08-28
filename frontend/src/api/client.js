// frontend/src/api/client.js
import axios from 'axios'

// Origin only (no trailing /api)
const RAW = import.meta.env.VITE_API_BASE || ''
const ORIGIN = RAW.replace(/\/+$/,'').replace(/\/api$/i, '')

// Helper: always return a path that starts with /api
export const apiUrl = (p = '') => {
  const path = String(p || '')
  if (path.startsWith('/api/')) return path
  return `/api${path.startsWith('/') ? path : `/${path}`}`
}

const api = axios.create({
  baseURL: ORIGIN,              // e.g. https://inventoryapp-app.up.railway.app
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL)
}

export default api
