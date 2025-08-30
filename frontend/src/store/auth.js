// frontend/src/store/auth.js
import { create } from 'zustand'
import api, { setAuthToken } from '../api/client'

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data || null, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  register: async ({ name, email, password }) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    // Cookie is set by the server; no need to store anything locally
    set({ user: data })
    // Ensure we’re not keeping a stale Bearer header around
    setAuthToken(null)
    return data
  },

  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password })
    set({ user: data })
    // We’re cookie-first; make sure any previous header is cleared
    setAuthToken(null)
    return data
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    set({ user: null })
    setAuthToken(null)
  },

  setUser: (u) => set({ user: u }),
}))
