// frontend/src/api/client.js
import axios from 'axios'

// Base is just the origin (NO /api suffix)
const RAW = import.meta.env.VITE_API_BASE || ''
const BASE = RAW.replace(/\/+$/,'').replace(/\/api$/i, '')

export const apiUrl = (path = '') => {
  const p = path.startsWith('/') ? path : `/${path}`
  return `/api${p}`
}

const api = axios.create({
  baseURL: BASE,                 // e.g. https://inventoryapp-app.up.railway.app
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL)
}

export default api
