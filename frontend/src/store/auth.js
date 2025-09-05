// frontend/src/store/auth.js
import { create } from 'zustand'
import api, { setAuthToken as setAxiosAuth } from '../api/client'

export const useAuth = create((set, get) => ({
  user: null,
  loading: false,

  setUser: (user) => set({ user }),

  // Save/remove JWT and wire Axios header
  setToken: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token)
      setAxiosAuth(token)
    } else {
      localStorage.removeItem('auth_token')
      setAxiosAuth(null)
    }
  },

  // Fetch current user using cookie or Authorization header
  loadMe: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/api/auth/me')
      set({ user: data || null })
    } catch {
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout') } catch {}
    localStorage.removeItem('auth_token')
    setAxiosAuth(null)
    set({ user: null })
    window.location.assign('/')
  },
}))
