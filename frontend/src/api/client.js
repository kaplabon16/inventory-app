// frontend/src/api/client.js
import axios from 'axios'

// Make sure we NEVER keep a trailing /api in base (this prevents /api/api/…)
const RAW = import.meta.env.VITE_API_BASE || ''
const BASE = RAW.replace(/\/+$/,'').replace(/\/api$/i, '') // strip trailing slashes and a trailing /api

const api = axios.create({
  baseURL: BASE,                 // e.g. https://inventoryapp-app.up.railway.app
  withCredentials: true,         // REQUIRED for cross-site cookie on OAuth/session
  headers: { 'Content-Type': 'application/json' },
})

// Debug once to ensure it’s correct in browser console
if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL)
}

export default api
