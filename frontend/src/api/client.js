// frontend/src/api/client.js
import axios from 'axios'

const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'') // e.g. https://inventoryapp-app.up.railway.app

// Build full /api path consistently
export const apiUrl = (path = '') => {
  const p = path.startsWith('/api') ? path : `/api${path}`
  return `${base}${p}`
}

const api = axios.create({
  baseURL: `${base}/api`,
  withCredentials: true, // send/receive auth cookies across origins
})

export default api
