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

  async hydrate() {
    // if token persisted, attach before first /me
    const saved = localStorage.getItem('auth_token')
    if (saved) setAuthToken(saved)
    return get().loadMe()
  },

  loginGoogle(redirect='/profile') {
    const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')
    window.location.href = `${base}/api/auth/google?redirect=${encodeURIComponent(redirect)}`
  },

  loginGithub(redirect='/profile') {
    const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')
    window.location.href = `${base}/api/auth/github?redirect=${encodeURIComponent(redirect)}`
  },

  async logout() {
    try { await api.post('/api/auth/logout') } finally {
      setAuthToken(null)
      set({ user: null })
      window.location.href = '/'
    }
  },

  setUser(u) { set({ user: u }) },

  setToken(t) { setAuthToken(t) }
}))
