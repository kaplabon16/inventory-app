// frontend/src/store/ui.js
import { create } from "zustand"

const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("theme") || "light"
  }
  return "light"
}

export const useUI = create((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),
  // Added for InventoryPage autosave indicator
  autosaveState: 'saved', // 'saving' | 'saved'
  setSaving: (state) => set({ autosaveState: state }),
}))
