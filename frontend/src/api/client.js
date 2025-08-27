import axios from 'axios'

const base = import.meta.env.VITE_API_BASE // e.g. https://inventoryapp-app.up.railway.app

const api = axios.create({
  baseURL: base,
  withCredentials: true, // send/receive cookies for /api/auth/me, etc.
})

export default api
