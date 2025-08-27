import { create } from 'zustand'

export const useUI = create((set, get) => ({
  theme: localStorage.getItem('theme') || 'light',
  setTheme(t) {
    localStorage.setItem('theme', t)
    set({ theme: t })
    if (t === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  },
  autosaveState: 'saved', // 'saving' | 'saved'
  setSaving(s) { set({ autosaveState: s }) },
  lang: localStorage.getItem('lang') || 'en',
  setLang(l) { localStorage.setItem('lang', l); set({ lang: l }) }
}))
