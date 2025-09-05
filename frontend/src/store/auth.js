
import { create } from 'zustand'
import api, { setAuthToken } from '../api/client'

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  async loadMe() {
    try {
      const { data } = await api.get('/api/auth/me')
      set({ user: data || null, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },


  setToken(token) {
    setAuthToken(token)
  },

  setUser(u) {
    set({ user: u })
  },

  async logout() {
    try { await api.post('/api/auth/logout') } catch {}
    setAuthToken(null)
    set({ user: null })
  },
}))


if (typeof window !== 'undefined') {
  useAuth.getState().loadMe().catch(() => {})
}
