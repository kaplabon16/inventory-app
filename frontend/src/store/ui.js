import { create } from "zustand"

export const useUI = create((set) => ({
  theme: (() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") || "light"
    return "light"
  })(),
  toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

  autosaveState: 'saved',
  setSaving: (state) => set({ autosaveState: state }),
}))
