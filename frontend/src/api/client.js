// frontend/src/api/client.js
import axios from 'axios'

const base =
  import.meta.env.VITE_API_BASE ||
  'http://localhost:3000' // fallback for local dev

const api = axios.create({
  baseURL: base.replace(/\/+$/, '') + '/api',
  withCredentials: true, // send/receive cookies cross-site
})

// Optional: allow legacy code to set/remove Authorization header.
// We still rely on cookies, but this keeps older imports working.
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Helper used in a few places to build absolute URLs
export const apiUrl = (path = '') =>
  (base.replace(/\/+$/, '') + (path.startsWith('/api') ? path : `/api${path}`))

if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL?.replace('/api',''))
}

export default api
