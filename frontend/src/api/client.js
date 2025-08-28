// frontend/src/api/client.js
import axios from 'axios'

// Ensure base is just the origin (no trailing / or /api)
const RAW = import.meta.env.VITE_API_BASE || ''
const BASE = RAW.replace(/\/+$/,'').replace(/\/api$/i, '')

export const apiUrl = (path = '') => {
  // Always prefix with /api once
  const p = path.startsWith('/') ? path : `/${path}`
  return `/api${p}`
}

const api = axios.create({
  baseURL: BASE,                 // e.g. https://inventoryapp-app.up.railway.app
  withCredentials: true,         // send cookies for /api/auth/me etc.
  headers: { 'Content-Type': 'application/json' },
})

// Debug once in the browser console so you can verify
if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL)
}

export default api