import axios from 'axios'

const RAW = import.meta.env.VITE_API_BASE || ''
const BASE = RAW.replace(/\/+$/,'').replace(/\/api$/i, '')

export const apiUrl = (path = '') => {
  const p = path.startsWith('/') ? path : `/${path}`
  return `/api${p}`
}

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

function applyAuthHeader() {
  const t = localStorage.getItem('auth_token')
  if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`
  else delete api.defaults.headers.common['Authorization']
}
applyAuthHeader()

// allow other modules to refresh header after we set/clear token
export function setAuthToken(token) {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
  applyAuthHeader()
}

if (typeof window !== 'undefined') {
  console.log('[api] baseURL =', api.defaults.baseURL)
}

export default api
ƒ