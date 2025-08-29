// axios client with credentials baked in
import axios from 'axios'

const base =
  import.meta.env.VITE_API_BASE ||
  (location.hostname === 'localhost' ? 'http://localhost:8080' : '')

console.log('[api] baseURL =', base)

const api = axios.create({
  baseURL: base,
  withCredentials: true, // send/receive httpOnly cookie
  timeout: 15000
})

export default api
export const apiUrl = (p) => `${base}${p.startsWith('/') ? p : `/${p}`}`
