// frontend/src/store/auth.js
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

  // App.jsx calls hydrate(); keep it as an alias so it never breaks
  async hydrate() {
    return get().loadMe()
  },

  loginGoogle() {
    // full-page nav to backend OAuth
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
    }
  },
}))