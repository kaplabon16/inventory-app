import axios from 'axios'

/**
 * Resolve API base URL from env or sensible defaults.
 * In Vercel, set VITE_API_URL to your Railway URL, e.g.:
 *   https://inventoryapp-app.up.railway.app
 */
const BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? (window.__API_BASE__ || '')
    : '') ||
  'http://localhost:3000'

console.log('[api] baseURL =', BASE)

export const apiUrl = (path) => {
  if (!path.startsWith('/')) path = '/' + path
  if (!path.startsWith('/api')) path = '/api' + path
  return `${BASE}${path}`
}

const api = axios.create({
  baseURL: BASE + '/api',
  withCredentials: true, // send cookies
  headers: { 'Content-Type': 'application/json' }
})

// Optional bearer token switch (not required when using cookies)
let bearer = null
export function setAuthToken(token) {
  bearer = token || null
  if (bearer) {
    api.defaults.headers.common['Authorization'] = `Bearer ${bearer}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// Response interceptor (optional logging)
api.interceptors.response.use(
  r => r,
  err => {
    // Re-throw a simple error object to avoid noisy axios blobs
    const e = new Error(err?.response?.data?.message || err?.message || 'Request failed')
    e.status = err?.response?.status
    e.data = err?.response?.data
    throw e
  }
)

export default api
