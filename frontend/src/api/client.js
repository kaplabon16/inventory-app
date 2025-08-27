// frontend/src/api/client.js
import axios from 'axios'

const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const api = axios.create({
  baseURL: base,
  withCredentials: true, // send/receive auth cookie from the backend origin
})

// Ensure every request goes to exactly one "/api/..." (no double /api)
api.interceptors.request.use((config) => {
  let url = config.url || ''
  if (!url.startsWith('/')) url = '/' + url
  if (!url.startsWith('/api/')) url = '/api' + url
  url = url.replace(/\/api\/api\//g, '/api/')
  config.url = url
  return config
})

export default api
