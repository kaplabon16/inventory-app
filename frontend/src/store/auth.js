// frontend/src/store/auth.js
import { create } from 'zustand'
import api from '../api/client'

export const useAuth = create((set, get) => ({
  user: null,
  loading: false,
  error: null,

  // Load current user from cookie
  hydrate: async () => {
    try {
      set({ loading: true, error: null })
      const { data } = await api.get('/api/auth/me')
      set({ user: data || null, loading: false })
    } catch (e) {
      set({ user: null, loading: false, error: e?.response?.data || null })
    }
  },

  register: async ({ name, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password })
      // cookie is set by server; keep local state in sync
      set({ user: data, loading: false })
      return data
    } catch (e) {
      set({ loading: false, error: e?.response?.data || e })
      throw e
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      // cookie is set by server; keep local state in sync
      set({ user: data, loading: false })
      return data
    } catch (e) {
      set({ loading: false, error: e?.response?.data || e })
      throw e
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } catch { /* ignore */ }
    set({ user: null })
  },

  setUser: (u) => set({ user: u })
}))
