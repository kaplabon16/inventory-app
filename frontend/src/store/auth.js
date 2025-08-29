import { create } from 'zustand'
import api from '../api/client'

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

  async hydrate() { return get().loadMe() },

  loginGoogle() {
    const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')
    window.location.href = `${base}/api/auth/google`
  },

  loginGithub() {
    const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')
    window.location.href = `${base}/api/auth/github`
  },

  async logout() {
    try { await api.post('/api/auth/logout') } finally {
      set({ user: null })
      window.location.href = '/'
    }
  },

  setUser(u) { set({ user: u }) }
}))
