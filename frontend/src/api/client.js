import axios from 'axios'

const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE) ||
  'https://inventoryapp-app.up.railway.app'

const API_BASE = RAW_BASE.replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // <— REQUIRED so cookies go with requests
  timeout: 20000
})

api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    console.debug('[api] →', cfg.method?.toUpperCase(), API_BASE + (cfg.url || ''))
  }
  return cfg
})
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      console.error('[api] ✕', err?.response?.status, err?.message, err?.response?.data)
    }
    return Promise.reject(err)
  }
)

export default api

// Keep to preserve older helpers:
export const apiUrl = (p) => (/^https?:\/\//i.test(p) ? p : `${API_BASE}${p}`)
