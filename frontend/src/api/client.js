// src/api/client.js
import axios from 'axios'

const base =
  import.meta.env.VITE_API_BASE ||
  'http://localhost:3000' // fallback for local dev

const api = axios.create({
  baseURL: base.replace(/\/+$/, '') + '/api',
  withCredentials: true, // <-- REQUIRED for cross-site cookies
})

// (optional) tiny helper for building absolute URLs for links
export const apiUrl = (path = '') =>
  (base.replace(/\/+$/, '') + (path.startsWith('/api') ? path : `/api${path}`))

// Log base once to help debug
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[api] baseURL =', api.defaults.baseURL?.replace('/api',''))
}

export default api
