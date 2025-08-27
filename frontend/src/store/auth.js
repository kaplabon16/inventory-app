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
  loginGoogle() { window.location.href = `${import.meta.env.VITE_API_BASE}/api/auth/google` },
  loginGithub() { window.location.href = `${import.meta.env.VITE_API_BASE}/api/auth/github` },
  async logout() {
    await api.post('/api/auth/logout')
    set({ user: null })
  }
}))
